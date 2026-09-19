/// Everything a meeting produced was said by other people, so it reaches the model
/// fenced and labelled as material. Content that carries the fence itself would let
/// it end the fence early and speak as us, so those tags are taken out first.
export function fence(tag: string, content: string): string {
  return `<${tag}>\n${content.replace(new RegExp(`</?${tag}>`, 'gi'), '')}\n</${tag}>`;
}
