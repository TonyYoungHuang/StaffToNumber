import type { FastifyInstance } from "fastify";
import { createHash, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { RecognitionCandidate, RecognitionResultManifest, ScoreJson } from "@score/shared";
import { db } from "../db.js";
import { findScoreDocumentById } from "../repositories/score-repository.js";
import { scoreJsonToMusicXml } from "../lib/score-musicxml-export.js";
import { parseMusicXmlToScoreJson } from "../lib/musicxml-score-parser.js";
import { assembleRecognitionMusicXml, RecognitionPageBoundaryError, selectRecognitionMusicXmlPages } from "../lib/recognition-result-assembly.js";

class ResultError extends Error { constructor(readonly code:string,message:string,readonly statusCode=409){super(message);} }
const titleKey=(title:string)=>title.normalize("NFKC").toLocaleLowerCase("und").replace(/(?:\s*[-–—]\s*\d+|\s*\(\s*\d+\s*\))\s*$/u,"").replace(/[\p{P}\p{Z}\s]/gu,"");
type SavedCandidate = RecognitionCandidate & { scoreJson?: ScoreJson };

function candidateContentWithoutTitle(score: ScoreJson) {
  const content = structuredClone(score) as Partial<ScoreJson>;
  delete content.title;
  delete content.interchange; // A re-import regenerates the XML baseline.
  if (content.source) content.source.originalName = "";
  if (content.metadata) {
    content.metadata.importedAt = ""; // Re-import time is provenance, not an edit.
    delete content.metadata.workTitle;
    delete content.metadata.movementTitle;
  }
  return content;
}

function selectedCandidateMusicXml(candidate: SavedCandidate & { scoreJson: ScoreJson }, keptPages: number[], candidates: SavedCandidate[], ancestors = new Set<string>()): string {
  if (ancestors.has(candidate.id) || ancestors.size >= 100) throw new Error("The saved page provenance is cyclic or too deeply nested. Select individual page results instead.");
  try { return selectRecognitionMusicXmlPages(scoreJsonToMusicXml(candidate.scoreJson), candidate.sourcePages, keptPages); }
  catch (error) {
    if (!(error instanceof RecognitionPageBoundaryError) || !candidate.memberIds?.length) throw error;
    if (new Set(candidate.memberIds).size !== candidate.memberIds.length) throw new Error("The saved page provenance is ambiguous. Select individual page results instead.");
    const members = candidate.memberIds.map(id => candidates.find(member => member.id === id));
    if (members.some(member => !member?.scoreJson)) throw new Error("The saved page provenance is incomplete. Select individual page results instead.");
    const available = members as Array<SavedCandidate & { scoreJson: ScoreJson }>;
    if (available.length === 1 && !isDeepStrictEqual(candidateContentWithoutTitle(candidate.scoreJson), candidateContentWithoutTitle(available[0]!.scoreJson))) {
      throw new Error("This saved result includes edits that cannot be safely mapped back to its original pages. Select individual page results instead.");
    }
    if (keptPages.some(page => available.filter(member => member.sourcePages.includes(page)).length !== 1)) throw new Error("The saved page provenance does not identify one result per retained page. Select individual page results instead.");
    const nextAncestors = new Set([...ancestors, candidate.id]);
    // Rebuild one source page at a time. Grouping whole children could reorder
    // interleaved provenance such as member A=[1,3], member B=[2,4].
    const retained = candidate.sourcePages.filter(page => keptPages.includes(page));
    return assembleRecognitionMusicXml(retained.map(page => selectedCandidateMusicXml(available.find(member => member.sourcePages.includes(page))!, [page], candidates, nextAncestors)));
  }
}
function candidateWithPages(member: SavedCandidate & { scoreJson: ScoreJson }, pages: number[], candidates: SavedCandidate[]) {
  try {
    const scoreJson = parseMusicXmlToScoreJson({
      musicXml: selectedCandidateMusicXml(member, pages, candidates), title: member.title,
      sourceFileId: member.musicxmlFileId, sourceOriginalName: "selected-pages.musicxml", importedAt: new Date().toISOString(),
    });
    scoreJson.title = member.title;
    scoreJson.metadata.workTitle = member.scoreJson.metadata.workTitle;
    scoreJson.metadata.movementTitle = member.scoreJson.metadata.movementTitle;
    scoreJson.metadata.composer = member.scoreJson.metadata.composer;
    return { ...member, sourcePages: member.sourcePages.filter(page => pages.includes(page)), scoreJson };
  } catch (error) { throw new ResultError("RESULT_PAGE_BOUNDARIES_UNAVAILABLE", error instanceof Error ? error.message : "These saved pages cannot be edited.", 409); }
}
function readResults(userId:string,documentId:string) {
  const document=findScoreDocumentById(documentId);
  if(!document || document.user_id!==userId || ["archived","deleted"].includes(document.status))throw new ResultError("SCORE_NOT_FOUND","This score is not available for your account.",404);
  const jobs=db.prepare("SELECT id, params_json FROM score_jobs WHERE document_id = ? AND user_id = ? AND job_type IN ('omr_import','musicxml_import') ORDER BY created_at DESC, id DESC")
    .all(documentId,userId) as Array<{id:string;params_json:string|null}>;
  const job=jobs.find(job=>job.params_json && JSON.parse(job.params_json).resultManifest);
  const params=job?.params_json?JSON.parse(job.params_json):{};
  const manifest=params.resultManifest as RecognitionResultManifest|undefined;
  const assets=db.prepare("SELECT file_id, params_json FROM score_assets WHERE document_id = ? AND revision_id IS NULL AND asset_kind = 'score_musicxml'")
    .all(documentId) as Array<{file_id:string;params_json:string|null}>;
  const candidates=(manifest?.candidates??[]).map(candidate=>{
    const asset=assets.find(a=>a.file_id===candidate.musicxmlFileId && a.params_json && JSON.parse(a.params_json).candidateId===candidate.id);
    const metadata=asset?.params_json?JSON.parse(asset.params_json):{};
    return {...candidate,scoreJson:metadata.scoreJson as ScoreJson|undefined};
  });
  return {document,job,params,manifest,candidates};
}
export function registerScoreRecognitionResultRoutes(app:FastifyInstance) {
  app.get("/scores/:id/candidates/:candidateId/musicxml-preview",{preHandler:app.requireScorePreviewAccess},async(request,reply)=>{
    try {const params=request.params as {id:string;candidateId:string};const data=readResults(request.authUserId!,params.id);
      const candidate=data.candidates.find(candidate=>candidate.id===params.candidateId);
      if(!candidate?.scoreJson)throw new ResultError("CANDIDATE_NOT_FOUND","This result is unavailable.",404);
      reply.header("Cache-Control","no-store");return {musicXml:scoreJsonToMusicXml(candidate.scoreJson)};
    } catch(error){if(error instanceof ResultError)return reply.code(error.statusCode).send({code:error.code,error:error.message});throw error;}
  });
  app.get("/scores/:id/candidates",{preHandler:app.requireScorePreviewAccess},async(request,reply)=>{
    try {const data=readResults(request.authUserId!,(request.params as {id:string}).id);reply.header("Cache-Control","no-store");
      return {candidates:data.candidates,selectedCandidateId:data.manifest?.selectedCandidateId,
        sourcePageCount:data.manifest?.sourcePageCount,deliveredPages:data.manifest?.deliveredPages,
        creditSettlement:data.params.creditSettlement};}
    catch(error){if(error instanceof ResultError)return reply.code(error.statusCode).send({code:error.code,error:error.message});throw error;}
  });
  const mutate=async(request:any,reply:any,kind:"select"|"combine"|"rename"|"drop")=>{
    const documentId=(request.params as {id:string}).id,body=request.body??{};
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("UPDATE score_documents SET updated_at=updated_at WHERE id = ? AND user_id = ?").run(documentId,request.authUserId);
      const data=readResults(request.authUserId,documentId);
      if(!data.job || !data.manifest)throw new ResultError("SCORE_RESULTS_UNAVAILABLE","No saved recognition alternatives are available.",404);
      if(body.expectedEditableRevisionId===undefined)throw new ResultError("SCORE_EDIT_REVISION_CONFLICT","Reload the current score before saving your selection.");
      const operation=[kind,body.candidateId,(request.params as {candidateId?:string}).candidateId,
        body.candidateIds,body.candidatePages,body.pageOrder,body.title,body.mode,body.expectedEditableRevisionId];
      if(kind==="drop")operation.push((request.params as {page:string}).page);
      const operationKey=createHash("sha256").update(JSON.stringify(operation)).digest("hex");
      const previousOperation=data.params.resultOperations?.[operationKey];
      if(previousOperation){db.exec("COMMIT");return {...previousOperation,creditsCharged:0,replayed:true};}
      const editable=data.document.pending_revision_id??data.document.current_revision_id;
      if(body.expectedEditableRevisionId!==undefined && body.expectedEditableRevisionId!==editable)throw new ResultError("SCORE_EDIT_REVISION_CONFLICT","This score changed. Reload it before saving your selection.");
      const saveOperation=(result:{revisionId:string|null;candidateId:string})=>{
        const resultOperations=Object.fromEntries([...Object.entries(data.params.resultOperations??{}).slice(-99),[operationKey,result]]);
        db.prepare("UPDATE score_jobs SET params_json = ? WHERE id = ?").run(JSON.stringify({...data.params,resultManifest:data.manifest,resultOperations}),data.job!.id);
        db.exec("COMMIT");
        return {...result,creditsCharged:0};
      };
      const ids=kind==="combine"?body.candidateIds:[kind==="rename"||kind==="drop"?(request.params as {candidateId:string}).candidateId:body.candidateId];
      if(!Array.isArray(ids) || !ids.length || ids.some(id=>typeof id!=="string") || new Set(ids).size!==ids.length)throw new ResultError("INVALID_CANDIDATES","Choose recognized results to use.",400);
      let members=ids.map(id=>data.candidates.find(candidate=>candidate.id===id));
      if(members.some(member=>!member?.scoreJson))throw new ResultError("CANDIDATE_NOT_FOUND","One selected result is unavailable.",404);
      let selected=members as Array<RecognitionCandidate&{scoreJson:ScoreJson}>;
      if(kind==="drop") {
        const member=selected[0]!,page=Number((request.params as {page:string}).page);
        if(!Number.isSafeInteger(page) || !member.sourcePages.includes(page))throw new ResultError("INVALID_CANDIDATE_PAGES","Choose a valid page from this result.",400);
        const pages=member.sourcePages.filter(value=>value!==page);
        const activeId=data.manifest.selectedCandidateId??data.candidates.find(candidate=>candidate.recommended)?.id??data.candidates[0]!.id;
        let retained: typeof member | undefined;
        if(pages.length) {
          if(member.id===activeId && editable) {
            const current=db.prepare("SELECT score_json FROM score_revisions WHERE id = ? AND document_id = ?").get(editable,documentId) as {score_json:string}|undefined;
            if(current)member.scoreJson=JSON.parse(current.score_json) as ScoreJson;
          }
          retained=candidateWithPages(member,pages,data.candidates);
          data.manifest.candidates=data.manifest.candidates.map(candidate=>candidate.id===member.id?{...candidate,sourcePages:retained!.sourcePages}:candidate);
        } else {
          if(!data.candidates.some(candidate=>candidate.id!==member.id && candidate.scoreJson))throw new ResultError("INVALID_CANDIDATE_PAGES","Keep at least one recognized page in this project.",400);
          data.manifest.candidates=data.manifest.candidates.filter(candidate=>candidate.id!==member.id);
        }
        const assets=db.prepare("SELECT id, params_json FROM score_assets WHERE document_id = ? AND revision_id IS NULL AND asset_kind = 'score_musicxml'").all(documentId) as Array<{id:string;params_json:string|null}>;
        for(const asset of assets)if(asset.params_json && JSON.parse(asset.params_json).candidateId===member.id) {
          if(retained)db.prepare("UPDATE score_assets SET params_json = ? WHERE id = ?").run(JSON.stringify({...JSON.parse(asset.params_json),scoreJson:retained.scoreJson,sourcePages:retained.sourcePages}),asset.id);
          else db.prepare("DELETE FROM score_assets WHERE id = ?").run(asset.id);
        }
        // An unselected alternative must not replace the customer's active edits.
        if(member.id!==activeId)return saveOperation({revisionId:editable,candidateId:activeId});
        selected=[retained??data.candidates.find(candidate=>candidate.id!==member.id && candidate.scoreJson)! as typeof member];
      }
      if (kind === "combine" && body.candidatePages !== undefined) {
        if (!body.candidatePages || typeof body.candidatePages !== "object" || Array.isArray(body.candidatePages) ||
          Object.keys(body.candidatePages).some(id => !ids.includes(id))) throw new ResultError("INVALID_CANDIDATE_PAGES", "Choose valid pages from the selected results.", 400);
        selected = selected.map(member => {
          const pages = body.candidatePages[member.id] ?? member.sourcePages;
          if (!Array.isArray(pages) || !pages.length || pages.some(page => !Number.isSafeInteger(page) || !member.sourcePages.includes(page)) || new Set(pages).size !== pages.length) {
            throw new ResultError("INVALID_CANDIDATE_PAGES", "Keep at least one valid page in each selected result.", 400);
          }
          return candidateWithPages(member, pages, data.candidates);
        });
      }
      if(kind==="combine" && body.pageOrder!==undefined) {
        const pages=[...new Set(selected.flatMap(member=>member.sourcePages))];
        if(!Array.isArray(body.pageOrder) || body.pageOrder.some((page:unknown)=>!Number.isSafeInteger(page)||Number(page)<1) ||
          new Set(body.pageOrder).size!==body.pageOrder.length || body.pageOrder.length!==pages.length || pages.some(page=>!body.pageOrder.includes(page)))throw new ResultError("INVALID_PAGE_ORDER","Choose a valid order for the retained source pages.",400);
        selected.sort((a,b)=>body.pageOrder.indexOf(a.sourcePages[0])-body.pageOrder.indexOf(b.sourcePages[0]));
      }
      if(kind==="combine" && body.mode!=="parallel") {
        const pages=new Set<number>();
        for(const member of selected)for(const page of member.sourcePages){
          if(pages.has(page) && selected.some(other=>other!==member && other.sourcePages.includes(page) && titleKey(other.title)===titleKey(member.title)))throw new ResultError("OVERLAPPING_RESULT_PAGES","Choose one version of each page before combining.",400);
          pages.add(page);
        }
      }
      let score=structuredClone(selected[0]!.scoreJson);
      if(kind==="rename" && data.manifest.selectedCandidateId===selected[0]!.id && editable) {
        const current=db.prepare("SELECT score_json FROM score_revisions WHERE id = ? AND document_id = ?").get(editable,documentId) as {score_json:string}|undefined;
        if(current)score=JSON.parse(current.score_json) as ScoreJson;
      }
      if(kind==="combine") {
        const xml=assembleRecognitionMusicXml(selected.map(member=>scoreJsonToMusicXml(member.scoreJson)),body.mode==="parallel"?"parallel":"append");
        score=parseMusicXmlToScoreJson({musicXml:xml,title:selected[0]!.title,sourceFileId:selected[0]!.musicxmlFileId,sourceOriginalName:"assembled.musicxml",importedAt:new Date().toISOString()});
      }
      const title=typeof body.title==="string"?body.title.trim().slice(0,200):undefined;
      if(kind==="rename" && !title)throw new ResultError("INVALID_SCORE_TITLE","Enter a title for this score.",400);
      if(title){score.title=title;score.metadata.workTitle=title;score.metadata.movementTitle=title;}
      // Rebuild after all edits to preserve unmodeled symbols in the raw XML.
      const xml=scoreJsonToMusicXml(score);
      score=parseMusicXmlToScoreJson({musicXml:xml,title:score.title,sourceFileId:selected[0]!.musicxmlFileId,sourceOriginalName:"recognition-result.musicxml",importedAt:new Date().toISOString()});
      const timestamp=new Date().toISOString(),revisionId=randomUUID();
      const revisionNumber=(db.prepare("SELECT COALESCE(MAX(revision_number),0)+1 AS number FROM score_revisions WHERE document_id = ?").get(documentId) as {number:number}).number;
      if(data.document.pending_revision_id)db.prepare("UPDATE score_revisions SET status='superseded' WHERE id = ? AND status='candidate'").run(data.document.pending_revision_id);
      db.prepare("INSERT INTO score_revisions (id,document_id,revision_number,score_json,musicxml_file_id,created_from,status,created_at) VALUES (?,?,?,?,NULL,'manual_edit','candidate',?)")
        .run(revisionId,documentId,revisionNumber,JSON.stringify(score),timestamp);
      db.prepare("UPDATE score_documents SET pending_revision_id = ?, title = ?, status='needs_review', updated_at = ? WHERE id = ?")
        .run(revisionId,score.title,timestamp,documentId);
      let candidateId=selected[0]!.id;
      if(kind==="combine" || kind==="rename") {
        candidateId=randomUUID();
        const item:RecognitionCandidate={id:candidateId,title:score.title,musicxmlFileId:selected[0]!.musicxmlFileId,
          sourcePages:[...new Set(selected.flatMap(member=>member.sourcePages))],relationship:"assembled",memberIds:ids};
        data.manifest.candidates.push(item);
        db.prepare("INSERT INTO score_assets (id,document_id,file_id,asset_kind,params_json,created_at) VALUES (?,?,?,'score_musicxml',?,?)")
          .run(randomUUID(),documentId,item.musicxmlFileId,JSON.stringify({candidateId,scoreJson:score,sourcePages:item.sourcePages}),timestamp);
      }
      data.manifest.selectedCandidateId=candidateId;
      return {...saveOperation({revisionId,candidateId}),scoreJson:score};
    } catch(error) {
      db.exec("ROLLBACK");
      if(error instanceof ResultError)return reply.code(error.statusCode).send({code:error.code,error:error.message});
      throw error;
    }
  };
  // Saved-result organization runs no recognition/export engine and remains
  // available when processing credits are exhausted. Ownership is locked above.
  app.post("/scores/:id/candidates/select",{preHandler:app.requireScorePreviewAccess},(request,reply)=>mutate(request,reply,"select"));
  app.post("/scores/:id/candidates/combine",{preHandler:app.requireScorePreviewAccess},(request,reply)=>mutate(request,reply,"combine"));
  app.patch("/scores/:id/candidates/:candidateId",{preHandler:app.requireScorePreviewAccess},(request,reply)=>mutate(request,reply,"rename"));
  app.delete("/scores/:id/candidates/:candidateId/pages/:page",{preHandler:app.requireScorePreviewAccess},(request,reply)=>mutate(request,reply,"drop"));
}
