var jacss=function()
{
// do context switch if necessary (for future to support several 'presentations':
if (this==window) { jacss.call(jacss); return; }

	var config = { frames: 0, container:"#cont", range:"#range",showIn:"#current",onBody:false };

	for(var n in config) {
        //noinspection JSUnfilteredForInLoop
        if (Object.prototype.hasOwnProperty.call(this.config,n)) {
            //noinspection JSUnfilteredForInLoop
            config[n] = this.config[n];
        }
    }
	
	var showInNodes = document.querySelectorAll(config.showIn);
	var rangeNodes = document.querySelectorAll(config.range);
		
	this.frame = 0;
		
	var doWithElements = function(list,fnc) {
		for(var i =0;i<list.length;i++) fnc(list[i]);
	};
	
	var container = document.querySelector(config.container);
    if (config.onBody) container = document.body;
    console.log(config);
	if (!container) throw new Error("Container ("+config.container+") was not found");
	
	this.next = function() {
	    this.set_stage(this.frame==config.frames?0:(this.frame+1));		
	};
	this.previous = function() {
	    this.set_stage(this.frame==0?config.frames:(this.frame-1));
	};
	
	this.set_stage = function(stage){	
		if (stage>this.frame) {
		   for (this.frame++;this.frame<=stage;this.frame++) {
			container.classList.add("s"+this.frame);
		   }
		   this.frame--;		
		} else if (stage<this.frame) {
			   container.classList.remove("s"+this.frame);
			   for (;this.frame>stage;this.frame--) {
				   container.classList.remove("s"+this.frame);
			   }
		}
		window.location.hash = stage;				
		doWithElements(showInNodes, function(x) { x.innerHTML = stage; });				
		doWithElements(rangeNodes, function(x) { x.value = stage; });
	};
	
	var instance = this;
	var rangeChanger = function(ev) { instance.set_stage(ev.target.value)	};	
	doWithElements(rangeNodes,function(x) { 
		x.setAttribute('max', config.frames);
		x.addEventListener("change", rangeChanger, false);
	});
	var keydown = function(event) {
        console.log(event);
        if (event.target.tagName == 'INPUT' || event.target.tagName == 'TEXTAREA') return false;
		if (event.keyCode == '32' || event.keyCode == '39' || event.keyCode == '34') { instance.next();event.preventDefault();event.stopPropagation();return false; }
		if (event.keyCode == '37' || event.keyCode == '33') { instance.previous();event.preventDefault();event.stopPropagation();return false; }
        return true;
	};
	window.addEventListener("keydown", keydown, false );
	window.onhashchange = function() {
		   instance.set_stage(window.location.hash.substring(1));
	};
	if (window.location.hash) {
		   this.set_stage(window.location.hash.substring(1));
	}
	
};
window.addEventListener("load", jacss, false);
