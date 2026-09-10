import ts from 'typescript';
const origin='http://localhost:5173';
const queue=[origin+(process.argv[2]??'/app/page.tsx')];
const visited=new Set();
const failures=[];
while(queue.length){
  const url=queue.shift();if(visited.has(url))continue;visited.add(url);
  const res=await fetch(url);const text=await res.text();
  if(!res.ok){failures.push({url,status:res.status});continue;}
  if(!res.headers.get('content-type')?.includes('javascript')){failures.push({url,type:res.headers.get('content-type')});continue;}
  const source=ts.createSourceFile(url,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const imports=[];
  const visit=node=>{
    if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))imports.push(node.moduleSpecifier.text);
    if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0]))imports.push(node.arguments[0].text);
    ts.forEachChild(node,visit);
  };visit(source);
  for(const spec of imports){if(spec.startsWith('/')||spec.startsWith('.')){const next=new URL(spec,url);if(next.origin===origin&&!visited.has(next.href))queue.push(next.href);}}
  if(visited.size>500)throw Error('Unexpectedly large module graph');
}
console.log(JSON.stringify({modulesChecked:visited.size,failures},null,2));
if(failures.length)process.exit(1);
