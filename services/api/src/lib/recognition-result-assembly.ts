import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";

type XmlNode = Record<string, any>;
const parser=new XMLParser({preserveOrder:true,ignoreAttributes:false,parseTagValue:false,trimValues:false});
const builder=new XMLBuilder({preserveOrder:true,ignoreAttributes:false,format:false});
const nodes=(node:XmlNode,name:string):XmlNode[]=>Array.isArray(node[name])?node[name]:[];
const text=(node:XmlNode|undefined)=>node?JSON.stringify(node):"";
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
