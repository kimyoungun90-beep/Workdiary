<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>업무일지 자동 작성기 - 매출/수기 입력 전용</title>
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xlsx-populate@1.21.0/browser/xlsx-populate.min.js"></script>
  <style>
    :root { --bg:#f3f6fb; --card:#fff; --text:#142033; --muted:#667085; --line:#d9e0ea; --blue:#1f6fd1; --dark:#263244; --red:#c51f28; --green:#16833a; }
    *{box-sizing:border-box} body{margin:0;font-family:Arial,'Malgun Gothic',sans-serif;background:var(--bg);color:var(--text)}
    header{background:#0f172a;color:white;padding:18px 22px;position:sticky;top:0;z-index:5} header h1{margin:0;font-size:22px} header p{margin:6px 0 0;color:#cbd5e1;font-size:13px}
    main{max-width:1180px;margin:24px auto 60px;padding:0 18px}.card{background:var(--card);border:1px solid #e5eaf2;border-radius:22px;padding:24px;margin-bottom:20px;box-shadow:0 10px 28px rgba(15,23,42,.06)}
    h2{margin:0 0 16px;font-size:20px}.grid{display:grid;gap:12px}.cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}
    label{display:block;font-weight:700;font-size:14px;margin-bottom:7px;color:#344054} input,select,textarea{width:100%;border:1px solid #ccd5e2;border-radius:13px;padding:12px 13px;font-size:15px;font-family:inherit;background:#fff}
    textarea{min-height:120px;resize:vertical;line-height:1.45} input:focus,select:focus,textarea:focus{outline:none;border-color:#6ea8fe;box-shadow:0 0 0 3px rgba(31,111,209,.12)}
    .hint{color:var(--muted);font-size:13px;line-height:1.45}.status{margin-top:13px;font-weight:800;min-height:22px}.success{color:#15803d}.danger{color:#dc2626}.warn{color:#d97706}.info{color:#2563eb}
    .btns{display:flex;gap:10px;flex-wrap:wrap;align-items:center} button{border:0;border-radius:13px;padding:12px 17px;font-size:15px;font-weight:800;cursor:pointer}.btn-primary{background:var(--blue);color:#fff}.btn-dark{background:var(--dark);color:#fff}.btn-soft{background:#eef4ff;color:#1e3a8a;border:1px solid #bcd0ff}
    table{width:100%;border-collapse:collapse;font-size:13px;background:#fff} th,td{border:1px solid #d7dee9;padding:7px;text-align:center} th{background:#d9d9d9;color:#111;font-weight:800}.scroll{overflow:auto;border-radius:14px;border:1px solid #e5eaf2;margin-top:10px}.section-row td{font-weight:800;text-align:left;background:#fff}.avg-light{background:#dbeaf7;font-weight:800}.avg-dark{background:#404040;color:#404040}.red{color:#ff0000;font-weight:800}.blue{color:#0057ff;font-weight:800}.bold{font-weight:800}
    @media(max-width:900px){.cols-2,.cols-3,.cols-4{grid-template-columns:1fr}}
  </style>
</head>
<body>
<header>
  <h1>업무일지 자동 작성기</h1>
  <p>AI 없이 매출현황 정리와 사용자가 입력한 내용을 업무일지 양식에 자동 반영합니다.</p>
</header>
<main>
  <section class="card">
    <h2>1. 기본 정보</h2>
    <div class="grid cols-4">
      <div><label>작성일자</label><input id="writeDate" type="date"></div>
      <div><label>업무일자</label><input id="workDate" type="date"></div>
      <div><label>주간 기간</label><input id="weekPeriod" type="text" placeholder="예: 5/25(월) ~ 5/31(일)"></div>
      <div><label>담당자</label><select id="manager"></select></div>
    </div>
  </section>

  <section class="card">
    <h2>2. 엑셀 파일 업로드</h2>
    <div class="grid cols-2">
      <div><label>업무일지 빈 양식</label><input id="templateFile" type="file" accept=".xlsx"><div class="hint">예: 양식 내용 미작성.xlsx</div></div>
      <div><label>매출 자동취합 파일</label><input id="salesFile" type="file" accept=".xlsx,.xls"><div class="hint">보고용_요약 시트 기준으로 읽습니다.</div></div>
    </div>
    <div id="fileStatus" class="status"></div>
  </section>

  <section class="card">
    <h2>3. 매출 현황 미리보기</h2>
    <div class="hint">김영언 선택 시 세종점 / 대전점 / 대구점 / 혁신점 순서로 정리합니다. 단위는 <b>백만원</b>이며, 전국 평균 이상은 빨간색, 미만은 파란색으로 표시합니다.</div>
    <div id="salesStatus" class="status"></div>
    <div class="scroll"><table id="salesPreview"><tbody><tr><td>매출 파일을 업로드하면 여기에 표시됩니다.</td></tr></tbody></table></div>
  </section>

  <section class="card">
    <h2>4. 업무일지 입력</h2>
    <div class="grid cols-2">
      <div><label>중점 추진 업무</label><textarea id="priorityWork" placeholder="예: 매장 방문"></textarea></div>
      <div><label>업무 내용</label><textarea id="workContent" placeholder="2. 업무 내용 영역에 들어갈 내용을 입력하세요."></textarea></div>
      <div><label>금일 활동계획</label><textarea id="todayPlan" placeholder="입력한 내용을 그대로 반영합니다."></textarea></div>
      <div><label>보고사항 및 특이사항</label><textarea id="specialNote" placeholder="입력한 내용을 그대로 반영합니다."></textarea></div>
    </div>
  </section>

  <section class="card">
    <h2>5. 생성</h2>
    <div class="btns"><button id="excelBtn" class="btn-primary" type="button">엑셀 생성</button><button id="resetBtn" class="btn-soft" type="button">입력 초기화</button></div>
    <div id="message" class="status"></div>
  </section>
</main>
<script>
const MANAGERS=["김영언","심창보","김현래","조재현","윤재경"];
const KIM_STORES=["세종점","대전점","대구점","혁신점"];
let templateArrayBuffer=null;
let rawSalesRows=[];

document.addEventListener("DOMContentLoaded",()=>{
  fillSelect("manager",MANAGERS,"김영언"); setDefaultDates();
  $("manager").addEventListener("change",updateSalesPreview);
  $("templateFile").addEventListener("change",handleTemplateFile);
  $("salesFile").addEventListener("change",handleSalesFile);
  $("excelBtn").addEventListener("click",createExcel);
  $("resetBtn").addEventListener("click",()=>{["priorityWork","workContent","todayPlan","specialNote"].forEach(id=>$(id).value=""); show("입력 내용을 초기화했습니다.","success");});
});
function $(id){return document.getElementById(id)}
function fillSelect(id,values,selected){$(id).innerHTML=values.map(v=>`<option value="${esc(v)}" ${v===selected?"selected":""}>${esc(v)}</option>`).join("")}
function setDefaultDates(){const d=new Date();const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,"0");const day=String(d.getDate()).padStart(2,"0");$("writeDate").value=`${y}-${m}-${day}`;$("workDate").value=`${y}-${m}-${day}`;$("weekPeriod").value=getWeekPeriod(d)}
function getWeekPeriod(date){const d=new Date(date);const day=d.getDay()||7;const mon=new Date(d);mon.setDate(d.getDate()-day+1);const sun=new Date(mon);sun.setDate(mon.getDate()+6);const w=["일","월","화","수","목","금","토"];const f=x=>`${x.getMonth()+1}/${x.getDate()}(${w[x.getDay()]})`;return `${f(mon)} ~ ${f(sun)}`}
async function handleTemplateFile(e){const file=e.target.files?.[0]; if(!file) return; templateArrayBuffer=await file.arrayBuffer(); show(`업무일지 양식 업로드 완료: ${file.name}`,"success","fileStatus")}
async function handleSalesFile(e){const file=e.target.files?.[0]; if(!file) return; try{const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:"array"});const sName=wb.SheetNames.includes("보고용_요약")?"보고용_요약":wb.SheetNames[0];const aoa=XLSX.utils.sheet_to_json(wb.Sheets[sName],{header:1,defval:""});rawSalesRows=parseSalesRows(aoa);updateSalesPreview();show(`매출 파일 업로드 완료: ${file.name} / ${rawSalesRows.length}개 행 읽음`,"success","fileStatus")}catch(err){rawSalesRows=[];updateSalesPreview();show(`매출 파일 읽기 실패: ${err.message||err}`,"danger","fileStatus")}}
function parseSalesRows(aoa){const idx=aoa.findIndex(r=>String(r[0]).trim()==="담당"&&String(r[1]).trim()==="점포"); if(idx<0) return []; return aoa.slice(idx+2).filter(r=>String(r[0]).trim()&&String(r[1]).trim()).map(r=>({manager:String(r[0]||"").trim(),store:cleanStore(String(r[1]||"").trim()),totalTarget:num(r[2]),totalSales:num(r[3]),totalRank:num(r[4]),totalRate:rate(r[5]),totalRateRank:num(r[6]),ceTarget:num(r[7]),ceSales:num(r[8]),ceRank:num(r[9]),ceRate:rate(r[10]),ceRateRank:num(r[11]),mxTarget:num(r[12]),mxSales:num(r[13]),mxRank:num(r[14]),mxRate:rate(r[15]),mxRateRank:num(r[16])})).filter(r=>r.store)}
function cleanStore(v){return v.replace(/^코스트코\s*/g,"").replace(/\s+/g,"").trim()}
function getFilteredSalesRows(){const manager=$("manager").value;let rows=rawSalesRows.filter(r=>r.store&&r.store!=="총매출"&&r.store!=="총 매출"); if(manager==="김영언"){rows=rows.filter(r=>r.manager===manager&&KIM_STORES.includes(r.store)); rows.sort((a,b)=>KIM_STORES.indexOf(a.store)-KIM_STORES.indexOf(b.store)); return rows} return rows.filter(r=>r.manager===manager)}
function calcAvgs(){const all=rawSalesRows.filter(r=>r.store&&r.store!=="총매출"&&r.store!=="총 매출");return {ce:{target:avg(all.map(r=>r.ceTarget)),sales:avg(all.map(r=>r.ceSales)),rate:avg(all.map(r=>r.ceRate))},mx:{target:avg(all.map(r=>r.mxTarget)),sales:avg(all.map(r=>r.mxSales)),rate:avg(all.map(r=>r.mxRate))}}}
function updateSalesPreview(){const rows=getFilteredSalesRows();const table=$("salesPreview"); if(!rawSalesRows.length){table.innerHTML="<tbody><tr><td>매출 파일을 업로드하면 여기에 표시됩니다.</td></tr></tbody>";$("salesStatus").textContent="";return} if(!rows.length){table.innerHTML="<tbody><tr><td>선택한 담당자의 매출 데이터가 없습니다.</td></tr></tbody>";show("선택 담당자 기준 데이터 없음","warn","salesStatus");return} const avgs=calcAvgs(); table.innerHTML=buildPreviewSection("CE",rows,avgs.ce)+buildPreviewSection("MX",rows,avgs.mx); show(`${$("manager").value} 매출 ${rows.length}개 점포 반영 준비 완료`,"success","salesStatus")}
function buildPreviewSection(type,rows,avgObj){const prefix=type.toLowerCase();let html=`<tbody><tr class="section-row"><td colspan="7">[${type} 매출]</td></tr><tr><th>점포명</th><th>목표</th><th>실적</th><th>달성률</th><th>매출 순위</th><th>달성률 순위</th><th>비고</th></tr>`; rows.forEach(r=>{const target=r[prefix+"Target"], sales=r[prefix+"Sales"], rt=r[prefix+"Rate"], rank=r[prefix+"Rank"], rateRank=r[prefix+"RateRank"];html+=`<tr><td class="bold">${esc(r.store)}</td><td class="bold">${one(target)}</td><td class="${sales>=avgObj.sales?"red":"blue"}">${one(sales)}</td><td class="${rt>=avgObj.rate?"red":"blue"}">${pct(rt)}</td><td class="bold">${rankText(rank)}</td><td class="blue">${rankText(rateRank)}</td><td></td></tr>`}); html+=`<tr><td class="avg-light">전국 평균</td><td class="avg-light">${one(avgObj.target)}</td><td class="avg-light">${one(avgObj.sales)}</td><td class="avg-light">${pct(avgObj.rate)}</td><td class="avg-dark"></td><td class="avg-dark"></td><td class="avg-dark"></td></tr></tbody>`; return html}
async function createExcel(){try{if(!templateArrayBuffer) throw new Error("업무일지 빈 양식을 먼저 업로드하세요."); if(!rawSalesRows.length) throw new Error("매출 자동취합 파일을 먼저 업로드하세요."); const wb=await XlsxPopulate.fromDataAsync(templateArrayBuffer.slice(0)); const sheet=wb.sheet(0); sheet.cell("C5").value(dateDot($("writeDate").value)); sheet.cell("G5").value($("manager").value); sheet.cell("A7").value(`1. 주간 업무 목표 [ 기간 : ${$("weekPeriod").value} ]`); writeSalesToSheet(sheet); sheet.cell("C24").value($("priorityWork").value||""); sheet.cell("C33").value($("workContent").value||""); sheet.cell("C88").value($("todayPlan").value||""); sheet.cell("C94").value($("specialNote").value||""); const blob=await wb.outputAsync({type:"blob"}); downloadBlob(blob,`업무일지_${$("manager").value}_${$("workDate").value||$("writeDate").value}.xlsx`); show("엑셀 생성 완료: 매출현황을 백만원 단위/색상 기준으로 정리했습니다.","success")}catch(err){show(err.message||String(err),"danger")}}
function writeSalesToSheet(sheet){const rows=getFilteredSalesRows();const avgs=calcAvgs(); sheet.cell("C10").value("[CE 매출]"); writeHeader(sheet,11); for(let i=0;i<4;i++) rows[i]?writeDataRow(sheet,12+i,rows[i],"ce",avgs.ce):clearRow(sheet,12+i); writeAvgRow(sheet,16,avgs.ce); sheet.cell("C17").value("[MX 매출]"); writeHeader(sheet,18); for(let i=0;i<4;i++) rows[i]?writeDataRow(sheet,19+i,rows[i],"mx",avgs.mx):clearRow(sheet,19+i); writeAvgRow(sheet,23,avgs.mx)}
function writeHeader(sheet,row){const headers=["점포명","목표","실적","달성률","매출 순위","달성률 순위","비고"];headers.forEach((h,i)=>{const c=sheet.cell(row,3+i);c.value(h);style(c,{bold:true,fill:"D9D9D9",horizontalAlignment:"center",verticalAlignment:"center",fontColor:"000000"})})}
function writeDataRow(sheet,row,r,p,av){const target=r[p+"Target"],sales=r[p+"Sales"],rt=r[p+"Rate"],rank=r[p+"Rank"],rateRank=r[p+"RateRank"]; const vals=[r.store,round1(target),round1(sales),pct(rt),rankText(rank),rankText(rateRank),""]; vals.forEach((v,i)=>sheet.cell(row,3+i).value(v)); for(let c=3;c<=9;c++) style(sheet.cell(row,c),{bold:true,horizontalAlignment:c===3?"center":"right",verticalAlignment:"center",fontColor:"000000"}); style(sheet.cell(row,5),{fontColor:sales>=av.sales?"FF0000":"0057FF",bold:true,horizontalAlignment:"right"}); style(sheet.cell(row,6),{fontColor:rt>=av.rate?"FF0000":"0057FF",bold:true,horizontalAlignment:"right"}); style(sheet.cell(row,8),{fontColor:"0057FF",bold:true,horizontalAlignment:"right"})}
function writeAvgRow(sheet,row,av){const vals=["전국 평균",round1(av.target),round1(av.sales),pct(av.rate),"","",""]; vals.forEach((v,i)=>sheet.cell(row,3+i).value(v)); for(let c=3;c<=6;c++) style(sheet.cell(row,c),{bold:true,fill:"DDEBF7",fontColor:"000000",horizontalAlignment:c===3?"center":"right"}); for(let c=7;c<=9;c++) style(sheet.cell(row,c),{fill:"404040",fontColor:"404040"})}
function clearRow(sheet,row){for(let c=3;c<=9;c++) sheet.cell(row,c).value("")}
function style(cell,obj){try{cell.style(obj)}catch(e){}}
function num(v){if(v===null||v===undefined||v==="") return 0;const n=Number(String(v).replace(/,/g,"").replace(/%/g,"").trim());return Number.isFinite(n)?n:0}
function rate(v){const n=num(v);return n>1?n/100:n}
function avg(a){const v=a.filter(x=>Number.isFinite(x)&&x!==0);return v.length?v.reduce((x,y)=>x+y,0)/v.length:0}
function round1(v){return Math.round(num(v)*10)/10}
function one(v){return round1(v).toFixed(1)}
function pct(v){return `${(rate(v)*100).toFixed(1)}%`}
function rankText(v){const n=Number(v);return Number.isFinite(n)&&n?`${Math.round(n)}위`:""}
function dateDot(v){if(!v)return"";const p=v.split("-");return p.length===3?`${p[0]}.${p[1]}.${p[2]}`:v}
function downloadBlob(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
function show(msg,type,id="message"){const el=$(id);if(!el)return;el.textContent=msg;el.className="status "+(type||"")}
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;")}
</script>
</body>
</html>
