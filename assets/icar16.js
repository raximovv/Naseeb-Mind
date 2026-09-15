// ICAR-16 public-domain cognitive assessment content. The four verbal, four
// series, four matrix and four spatial items are kept separate from the UI so
// the score can be audited without changing presentation code.
var ICAR16_ITEMS = [
  {id:'VR.04',domain:'verbal',text:'What number is one fifth of one fourth of one ninth of 900?',options:['2','3','4','5','6','7'],answer:3},
  {id:'VR.16',domain:'verbal',text:'Zach is taller than Matt and Richard is shorter than Zach. Which statement is most accurate?',options:['Richard is taller than Matt','Richard is shorter than Matt','Richard is as tall as Matt','It is impossible to tell'],answer:3},
  {id:'VR.17',domain:'verbal',text:'Joshua is 12 and his sister is three times as old. When Joshua is 23, how old will his sister be?',options:['35','39','44','47','53','57'],answer:3},
  {id:'VR.19',domain:'verbal',text:'If the day after tomorrow is two days before Thursday, what day is today?',options:['Friday','Monday','Wednesday','Saturday','Tuesday','Sunday'],answer:5},
  {id:'LN.07',domain:'series',text:'What letter comes next? K N P S U',options:['S','T','U','V','W','X'],answer:5},
  {id:'LN.33',domain:'series',text:'What letter comes next? V Q M J H',options:['E','F','G','H','I','J'],answer:2},
  {id:'LN.34',domain:'series',text:'What letter comes next? I J L O S',options:['T','U','V','X','Y','Z'],answer:3},
  {id:'LN.58',domain:'series',text:'What letter comes next? Q S N P L',options:['J','H','I','N','M','L'],answer:3},
  {id:'MR.45',domain:'matrix',image:'assets/icar/icar16-mr45-v1.png',imageAlt:'ICAR matrix reasoning puzzle',options:['A','B','C','D','E','F'],answer:4},
  {id:'MR.46',domain:'matrix',image:'assets/icar/icar16-mr46-v1.png',imageAlt:'ICAR matrix reasoning puzzle',options:['A','B','C','D','E','F'],answer:1},
  {id:'MR.47',domain:'matrix',image:'assets/icar/icar16-mr47-v1.png',imageAlt:'ICAR matrix reasoning puzzle',options:['A','B','C','D','E','F'],answer:1},
  {id:'MR.55',domain:'matrix',image:'assets/icar/icar16-mr55-v1.png',imageAlt:'ICAR matrix reasoning puzzle',options:['A','B','C','D','E','F'],answer:3},
  {id:'R3D.03',domain:'spatial',image:'assets/icar/icar16-r3d03-v1.png',imageAlt:'ICAR spatial cube rotation puzzle',options:['A','B','C','D','E','F','G','H'],answer:2},
  {id:'R3D.04',domain:'spatial',image:'assets/icar/icar16-r3d04-v1.png',imageAlt:'ICAR spatial cube rotation puzzle',options:['A','B','C','D','E','F','G','H'],answer:1},
  {id:'R3D.06',domain:'spatial',image:'assets/icar/icar16-r3d06-v1.png',imageAlt:'ICAR spatial cube rotation puzzle',options:['A','B','C','D','E','F','G','H'],answer:5},
  {id:'R3D.08',domain:'spatial',image:'assets/icar/icar16-r3d08-v1.png',imageAlt:'ICAR spatial cube rotation puzzle',options:['A','B','C','D','E','F','G','H'],answer:6}
];
