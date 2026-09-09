import { ServiceGlyph } from "../../components/ServiceGlyph";
export type EntryChoice = "known-tracks" | "interest-survey" | "completed-courses";
export const ENTRY_CHOICES = [
  { id:"known-tracks",title:"트랙을 정했어요",description:"여러 트랙을 함께 선택할 수 있어요.",glyph:"tracks" },
  { id:"interest-survey",title:"관심으로 찾아볼래요",description:"어떤 분야를 배우고 싶은지부터 정하고 싶어요.",glyph:"interest" },
  { id:"completed-courses",title:"들은 과목으로 찾아볼래요",description:"이미 들은 수업을 살려 추가 부담이 적은 트랙을 찾고 싶어요.",glyph:"courses" },
] as const;
export function EntryChoices({value,onChange}:{value?:EntryChoice;onChange:(intent:EntryChoice)=>void}){
  return <fieldset className="journey-entry-options"><legend className="sr-only">시작 방법 선택</legend>{ENTRY_CHOICES.map(({id,title,description,glyph})=><label key={id} className="journey-entry-option" data-selected={value===id}><ServiceGlyph kind={glyph}/><span><strong>{title}</strong><small>{description}</small></span><input type="radio" name="entry-intent" value={id} checked={value===id} onChange={()=>onChange(id)} /></label>)}</fieldset>;
}
