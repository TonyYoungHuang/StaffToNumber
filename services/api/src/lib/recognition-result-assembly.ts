import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";

type XmlNode = Record<string, any>;
const parser=new XMLParser({preserveOrder:true,ignoreAttributes:false,parseTagValue:false,trimValues:false});
const builder=new XMLBuilder({preserveOrder:true,ignoreAttributes:false,format:false});
const nodes=(node:XmlNode,name:string):XmlNode[]=>Array.isArray(node[name])?node[name]:[];
const text=(node:XmlNode|undefined)=>node?JSON.stringify(node):"";

export class RecognitionPageBoundaryError extends Error {}

/** Delete actual MusicXML measures for omitted source pages, retaining unknown
 * notation and inherited musical attributes. Source page numbers may have gaps
 * after partial recognition; their order maps to the saved page boundaries. */
export function selectRecognitionMusicXmlPages(xml: string, sourcePages: number[], keptPages: number[]) {
  if (!keptPages.length || new Set(keptPages).size !== keptPages.length || keptPages.some(page => !sourcePages.includes(page))) {
    throw new Error("Choose at least one valid source page for each result.");
  }
  if (keptPages.length === sourcePages.length) return xml;
  if (Buffer.byteLength(xml) > 20 * 1024 * 1024 || /<!ENTITY\b/iu.test(xml) || XMLValidator.validate(xml) !== true) throw new Error("This result cannot be safely edited.");
  const tree = parser.parse(xml) as XmlNode[];
  const root = tree.find(node => node["score-partwise"]);
  if (!root) throw new Error("Only readable MusicXML pages can be edited.");
  const parts = nodes(root, "score-partwise").filter(node => node.part).map(part => {
    const measures = nodes(part, "part").filter(node => node.measure);
    const starts = [0, ...measures.flatMap((measure, index) => index > 0 && nodes(measure, "measure").some(item => item.print && item[":@"]?.["@_new-page"] === "yes") ? [index] : [])];
    return { part, measures, starts };
  });
  const reference = parts.find(part => part.starts.length === sourcePages.length);
  const unavailable = () => new RecognitionPageBoundaryError("The saved result has no reliable page boundaries. Select its individual page results instead.");
  if (!reference) throw unavailable();
  const referenceNumbers = reference.measures.map(measure => measure[":@"]?.["@_number"] as string | undefined);
  for (const { part, measures, starts } of parts) {
    let pageIndices: number[];
    if (starts.length === sourcePages.length) {
      pageIndices = measures.map((_measure, index) => starts.filter(start => start <= index).length - 1);
    } else {
      // MusicXML may put page printing instructions only on the top part. An
      // identical measure-number sequence has an exact ordinal correspondence.
      // Otherwise require unique, increasing shared numbers; never invent rests
      // or guess how an unrelated part lines up with the reference part.
      const numbers = measures.map(measure => measure[":@"]?.["@_number"] as string | undefined);
      let ordinals: number[];
      if (numbers.length === referenceNumbers.length && numbers.every((number, index) => number && number === referenceNumbers[index])) {
        ordinals = numbers.map((_number, index) => index);
      } else {
        ordinals = numbers.map(number => {
          if (!number || referenceNumbers.filter(item => item === number).length !== 1 || numbers.filter(item => item === number).length !== 1) throw unavailable();
          return referenceNumbers.indexOf(number);
        });
        if (ordinals.some((ordinal, index) => index > 0 && ordinal <= ordinals[index - 1]!)) throw unavailable();
      }
      pageIndices = ordinals.map(ordinal => reference.starts.filter(start => start <= ordinal).length - 1);
      if (starts.slice(1).some(start => start > 0 && pageIndices[start] === pageIndices[start - 1])) throw unavailable();
    }
    let measureIndex = 0, previousKept = false;
    const attributes = new Map<string, XmlNode>();
    const retained: XmlNode[] = [];
    for (const node of nodes(part, "part")) {
      if (!node.measure) { retained.push(node); continue; }
      const contents = nodes(node, "measure");
      const ownAttributes = contents.find(item => item.attributes);
      for (const attribute of nodes(ownAttributes ?? {}, "attributes")) {
        const name = Object.keys(attribute).find(key => key !== ":@" && key !== "#text");
        if (name) attributes.set(`${name}:${attribute[":@"]?.["@_number"] ?? ""}`, structuredClone(attribute));
      }
      const keep = keptPages.includes(sourcePages[pageIndices[measureIndex++]!]!);
      if (keep) {
        if (!previousKept) {
          const replacement = { attributes: [...attributes.values()].map(item => structuredClone(item)) };
          if (ownAttributes) contents[contents.indexOf(ownAttributes)] = replacement;
          else contents.unshift(replacement);
        }
        retained.push(node);
      }
      previousKept = keep;
    }
    part.part = retained;
  }
  return builder.build(tree) as string;
}
/** Assemble actual XML subtrees, then re-import to rebuild the preservation
 * baseline. Never reorder ScoreJSON arrays under an obsolete XML fingerprint. */
export function assembleRecognitionMusicXml(sources:string[], mode:"append"|"parallel"="append") {
  if(!sources.length)throw new Error("Choose at least one recognized page or piece.");
  const roots=sources.map((xml,sourceIndex)=>{
    if(Buffer.byteLength(xml)>20*1024*1024 || /<!ENTITY\b/iu.test(xml) || XMLValidator.validate(xml)!==true)throw new Error("A result cannot be safely assembled.");
    const tree=parser.parse(xml) as XmlNode[];
    const namespace=(value:unknown)=>{
      if(Array.isArray(value)){value.forEach(namespace);return;}
      if(!value || typeof value!=="object")return;
      const node=value as XmlNode;
      for(const [key,item] of Object.entries(node)){
        if(["@_id","@_idref","@_startid","@_endid"].includes(key) && typeof item==="string")node[key]=`R${sourceIndex}_${item}`;
        else namespace(item);
      }
    };
    namespace(tree);
    const root=tree.find(node=>node["score-partwise"]);
    if(!root)throw new Error("Only readable MusicXML results can be assembled.");
    return {tree,root,children:nodes(root,"score-partwise")};
  });
  const result=roots[0]!;
  const partList=result.children.find(node=>node["part-list"])??{"part-list":[]};
  if(!result.children.includes(partList))result.children.unshift(partList);
  const outputParts=result.children.filter(node=>node.part);
  let nextId=outputParts.length+1;
  for(const [sourceIndex,source] of roots.entries()) {
    if(sourceIndex===0)continue;
    const definitions=nodes(source.children.find(node=>node["part-list"])??{},"part-list").filter(node=>node["score-part"]);
    for(const [partIndex,part] of source.children.filter(node=>node.part).entries()) {
      const oldId=part[":@"]?.["@_id"];
      const definition=definitions.find(node=>node[":@"]?.["@_id"]===oldId);
      const originalName=nodes(definition??{},"score-part").find(node=>node["part-name"]);
      const target=mode==="append"?outputParts.find((target,index)=>{
        const def=nodes(partList,"part-list").find(node=>node[":@"]?.["@_id"]===target[":@"]?.["@_id"]);
        return index===partIndex && text(nodes(def??{},"score-part").find(node=>node["part-name"])).normalize("NFKC").toLowerCase()===text(originalName).normalize("NFKC").toLowerCase();
      }):undefined;
      if(!target) {
        const id=`R${nextId++}`;
        part[":@"]={...part[":@"],"@_id":id};
        if(definition){definition[":@"]={...definition[":@"],"@_id":id};nodes(partList,"part-list").push(definition);}
        result.children.push(part);outputParts.push(part);
      } else {
        const targetDefinition=nodes(partList,"part-list").find(node=>node[":@"]?.["@_id"]===target[":@"]?.["@_id"]);
        if(targetDefinition && definition)nodes(targetDefinition,"score-part").push(...nodes(definition,"score-part").filter(node=>node["score-instrument"]||node["midi-instrument"]||node["midi-device"]));
        const offset=nodes(target,"part").filter(node=>node.measure).length;
        const appended=nodes(part,"part").filter(node=>node.measure);
        if (appended[0]) {
          const firstMeasure = nodes(appended[0], "measure");
          let printing = firstMeasure.find(node => node.print);
          if (!printing) { printing = { print: [] }; firstMeasure.unshift(printing); }
          printing[":@"] = { ...printing[":@"], "@_new-page": "yes" };
        }
        for(const [i,measure] of appended.entries())measure[":@"]={...measure[":@"],"@_number":String(offset+i+1)};
        // Each segment retains its initial key/time/clef/transposition, lyrics,
        // notation and unknown XML elements. No synthetic rests or notes.
        nodes(target,"part").push(...appended);
      }
    }
  }
  const xml=builder.build(result.tree) as string;
  if(Buffer.byteLength(xml)>20*1024*1024)throw new Error("The assembled score exceeds the safe editor size. The original results remain available.");
  return xml;
}
