function include(file) { 
  
    var script  = document.createElement('script'); 
    script.src  = file; 
    script.type = 'text/javascript'; 
    script.defer = true; 
    
    document.getElementsByTagName('head').item(0).appendChild(script); 
    
  } 

  /* Include Many js files */
// include('Tone.js');
// include('instruments.js')
// include('regionsRel.js')
// include('regionsAbs.js')
// include('timedOnsets.js')