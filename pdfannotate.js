/**
 * PDFAnnotate v1.0.1
 * Author: Ravisha Heshan
 */
fabric.IText.prototype.defRender = fabric.IText.prototype.render;
fabric.IText.prototype.render = function(ctx) {
	this.clearContextTop();
	this.defRender(ctx);
	this.cursorOffsetCache = { };
	this.renderCursorOrSelection();
	ctx.strokeStyle = "red"; 
	ctx.lineWidth = 3; 
	let coords = this.calcCoords();
	ctx.beginPath();
	ctx.moveTo(coords.tl.x, coords.tl.y);
	ctx.lineTo(coords.tr.x, coords.tr.y);
	ctx.lineTo(coords.br.x, coords.br.y);
	ctx.lineTo(coords.bl.x, coords.bl.y);
	ctx.closePath();
	ctx.stroke();
}

var PDFAnnotate = function(url, options = {}) {
	this.number_of_pages = 0;
	this.pages_rendered = 0;
	this.active_tool = 1; // 1 - Free hand, 2 - Text, 3 - Arrow, 4 - Rectangle
	this.fabricObjects = [];
	this.fabricObjectsData = [];
	this.color = '#212121';
	this.borderColor = '#000000';
	this.borderSize = 1;
	this.font_size = 16;
	this.active_canvas = 0;
	this.url = url;
	this.pageImageCompression = options.pageImageCompression;
	var inst = this;

	//dom id
	this.container_id = "";
	this.component_id = "";
	this.toolbar_id = "";

	//scale; <int || fit>
	this.scale = 1;
	this.scalePrev = this.scale;
	this.scaleMIN = 0.1;
	this.scaleMAX = 1.3;

	//step
	this.step = 0.1;

	//calback functions
	this.onAnnotationCreate = function() {};
	this.onAnnotationUpdate = function() {};
	this.onAnnotationDelete = function() {};

	//loadPDF on startup
	var loadingTask = pdfjsLib.getDocument(url);
	loadingTask.promise.then(function (pdf) {
		inst.pdf = pdf;
		inst.render(options);
	}, function (reason) {
		console.error(reason);
	});

	this.setOptions = function(options){
		Object.assign(this, options);
	}

	this.getFirstPage = function(){
		return new Promise( function (resolve){
			inst.pdf.getPage(1).then(resolve);
		});
	}

	this.zoomIn = function(){
		this.render({
			scale: this.scale + this.step
		});
	}

	this.zoomOut = function(){
		this.render({
			scale: this.scale - this.step
		});
	}

	this.fit = function(){
		this.render({
			scale: "fit"
		});
	}

	this.getCurrentPage = function(){
		const component = document.getElementById(this.component_id);	
		const toolbar = document.getElementById(this.toolbar_id);
		const scrollTop = component.scrollTop + toolbar.offsetHeight;

		const page = document.getElementsByClassName("canvas-container")[0];
		const pageContainerMargin = 25;
		const pageHeight = page.offsetHeight + pageContainerMargin;

		return Math.floor(scrollTop / pageHeight);
	}

	this.nextPage = function(){
		const currentPage = this.getCurrentPage();
		if(currentPage + 1 < this.number_of_pages){
			const component = document.getElementById(this.component_id);	
			const toolbar = document.getElementById(this.toolbar_id);
			const page = document.getElementsByClassName("canvas-container")[0];
			const pageContainerMargin = 25;
			const pageHeight = page.offsetHeight + pageContainerMargin;
			component.scrollTop = (currentPage + 1) * pageHeight + toolbar.offsetHeight;
		}
	}

	this.previousPage = function(){
		
		console.log(inst.fabricObjectsData);
		const currentPage = this.getCurrentPage();
		if(currentPage - 1 >= 0){
			const component = document.getElementById(this.component_id);	
			const toolbar = document.getElementById(this.toolbar_id);
			const page = document.getElementsByClassName("canvas-container")[0];
			const pageContainerMargin = 25;
			const pageHeight = page.offsetHeight + pageContainerMargin;
			component.scrollTop = (currentPage - 1) * pageHeight + toolbar.offsetHeight;
		}
	}

	this.render = async function (options){
		this.scalePrev = this.scale;
		this.setOptions(options);
		const pdf = this.pdf;
		
		const json = this.saveToFullJSON();
		console.log(JSON.parse(json));
		this.pages_rendered = 0;
		this.fabricObjects = [];
		
		const container = document.getElementById(inst.container_id);
		const component = document.getElementById(inst.component_id);
		const toolbar = document.getElementById(this.toolbar_id);
		container.innerHTML = "";
		const componentHeight = component.clientHeight - toolbar.offsetHeight;

		if(this.scale == "fit"){
			const page = await this.getFirstPage();
			this.scale = (componentHeight / page._pageInfo.view[3]) * this.scalePrev;
		}
		else if(this.scale > this.scaleMAX)
			this.scale = this.scaleMAX
		else if(this.scale < this.scaleMIN)
			this.scale = this.scaleMIN
		

	    inst.number_of_pages = pdf.numPages;

	    for (var i = 1; i <= pdf.numPages; i++) {
	        pdf.getPage(i).then(function (page) {
	            var viewport = page.getViewport({scale: inst.scale});
	            var canvas = document.createElement('canvas');
	            container.appendChild(canvas);
	            canvas.className = 'pdf-canvas';
	            canvas.height = viewport.height;
	            canvas.width = viewport.width;
	            context = canvas.getContext('2d');

	            var renderContext = {
	                canvasContext: context,
	                viewport: viewport
				};
	            var renderTask = page.render(renderContext);
	            renderTask.promise.then(function () {
	                $('.pdf-canvas').each(function (index, el) {
	                    $(el).attr('id', 'page-' + (index + 1) + '-canvas');
	                });
	                inst.pages_rendered++;
	                if (inst.pages_rendered == inst.number_of_pages){
						inst.initFabric();
						if(json) inst.loadFromFullJSON(JSON.parse(json));
					} 
	            });
	        });
	    }
	}

	this.initFabric = function () {
		var inst = this;
		let canvases = $('#' + inst.container_id + ' canvas')
	    canvases.each(function (index, el) {
	        var background = el.toDataURL("image/png");
	        var fabricObj = new fabric.Canvas(el.id, {
	            freeDrawingBrush: {
	                width: 1,
	                color: inst.color
	            }
	        });
			inst.fabricObjects.push(fabricObj);
			if (typeof options.onPageUpdated == 'function') {
				fabricObj.on('object:added', function() {
					var oldValue = Object.assign({}, inst.fabricObjectsData[index]);
					inst.fabricObjectsData[index] = fabricObj.toJSON()
					console.log("update");
					options.onPageUpdated(index + 1, oldValue, inst.fabricObjectsData[index]) 
				})
			}
	        fabricObj.setBackgroundImage(background, fabricObj.renderAll.bind(fabricObj));
	        $(fabricObj.upperCanvasEl).click(function (event) {
	            inst.active_canvas = index;
	            inst.fabricClickHandler(event, fabricObj);
			});
			fabricObj.on('after:render', function () {
				inst.fabricObjectsData[index] = fabricObj.toJSON()
				fabricObj.off('after:render')
			})

			fabricObj.on('object:modified', function (event) {
				const annotation = event.target;
				annotation.normalLeft = annotation.left / inst.scale;
				annotation.normalTop = annotation.top / inst.scale;
				annotation.normalFontSize = annotation.fontSize / inst.scale; 

				inst.onAnnotationUpdate();
			});

			if (index === canvases.length - 1 && typeof options.ready === 'function') {
				options.ready()
			}
		});
	}

	this.fabricClickHandler = function(event, fabricObj) {
		var inst = this;
		if (inst.active_tool != 0) {
			if (inst.active_tool == 2) {	
				const text = new fabric.IText('Sample text', {
					left: event.clientX - fabricObj.upperCanvasEl.getBoundingClientRect().left,
					top: event.clientY - fabricObj.upperCanvasEl.getBoundingClientRect().top,
					fill: inst.color,
					fontSize: inst.font_size,
					selectable: true,
					hasRotatingPoint: false,
					id: Date.now(),
					normalTop: 0,
					normalLeft: 0,
					normalFontSize: 0,
					hasControls: false
				});

				text.normalLeft = text.left / inst.scale;
				text.normalTop = text.top / inst.scale;
				text.normalFontSize = text.fontSize / inst.scale; 

				fabricObj.add(text);
				inst.active_tool = 0;
				console.log(fabricObj, text);
			}
			this.onAnnotationCreate();
		}
	}
}

PDFAnnotate.prototype.enableSelector = function () {
	var inst = this;
	inst.active_tool = 0;
	if (inst.fabricObjects.length > 0) {
	    $.each(inst.fabricObjects, function (index, fabricObj) {
	        fabricObj.isDrawingMode = false;
	    });
	}
}

PDFAnnotate.prototype.enablePencil = function () {
	var inst = this;
	inst.active_tool = 1;
	if (inst.fabricObjects.length > 0) {
	    $.each(inst.fabricObjects, function (index, fabricObj) {
	        fabricObj.isDrawingMode = true;
	    });
	}
}

PDFAnnotate.prototype.enableAddText = function () {
	var inst = this;
	inst.active_tool = 2;
	if (inst.fabricObjects.length > 0) {
	    $.each(inst.fabricObjects, function (index, fabricObj) {
	        fabricObj.isDrawingMode = false;
	    });
	}
}

PDFAnnotate.prototype.deleteSelectedObject = function () {
	var inst = this;
	var activeObject = inst.fabricObjects[inst.active_canvas].getActiveObject();
	if (activeObject)
	{
	    if (confirm('Are you sure ?')) {
			inst.fabricObjects[inst.active_canvas].remove(activeObject);
			this.onAnnotationDelete();
		}
	}
}

PDFAnnotate.prototype.savePdf = function (fileName) {
	var inst = this;
	var doc = new jspdf.jsPDF();
	if (typeof fileName === 'undefined') {
		fileName = `${new Date().getTime()}.pdf`;
	}

	inst.fabricObjects.forEach(function (fabricObj, index) {
		if (index != 0) {
			doc.addPage();
			doc.setPage(index + 1);
		}
		doc.addImage(
			fabricObj.toDataURL({
				format: 'png'
			}), 
			inst.pageImageCompression == "NONE" ? "PNG" : "JPEG", 
			0, 
			0,
			doc.internal.pageSize.getWidth(), 
			doc.internal.pageSize.getHeight(),
			`page-${index + 1}`, 
			["FAST", "MEDIUM", "SLOW"].indexOf(inst.pageImageCompression) >= 0
			? inst.pageImageCompression
			: undefined
		);
		if (index === inst.fabricObjects.length - 1) {
			doc.save(fileName);
		}
	})
}

PDFAnnotate.prototype.setBrushSize = function (size) {
	var inst = this;
	$.each(inst.fabricObjects, function (index, fabricObj) {
	    fabricObj.freeDrawingBrush.width = size;
	});
}

PDFAnnotate.prototype.setColor = function (color) {
	var inst = this;
	inst.color = color;
	$.each(inst.fabricObjects, function (index, fabricObj) {
        fabricObj.freeDrawingBrush.color = color;
    });
}

PDFAnnotate.prototype.setBorderColor = function (color) {
	var inst = this;
	inst.borderColor = color;
}

PDFAnnotate.prototype.setFontSize = function (size) {
	this.font_size = size;
}

PDFAnnotate.prototype.setBorderSize = function (size) {
	this.borderSize = size;
}

PDFAnnotate.prototype.clearActivePage = function () {
	var inst = this;
	var fabricObj = inst.fabricObjects[inst.active_canvas];
	var bg = fabricObj.backgroundImage;
	if (confirm('Are you sure?')) {
	    fabricObj.clear();
	    fabricObj.setBackgroundImage(bg, fabricObj.renderAll.bind(fabricObj));
		this.onAnnotationDelete();
	}
}

PDFAnnotate.prototype.saveToFullJSON = function() {
	var inst = this;
	const array = inst.fabricObjects.map(fabricObject => {
		return fabricObject.toJSON(["id", "normalLeft", "normalTop", "normalFontSize"]);
	})
	return JSON.stringify(array);
}

PDFAnnotate.prototype.saveToJSON = function() {
	var inst = this;
	const array = inst.fabricObjects.map(function(fabricObject) {
		return fabricObject.toJSON(["id", "normalLeft", "normalTop", "normalFontSize"]);
	})

	console.log(array);
	const annotations = [];
	array.forEach(function(page, index) {
		page.objects.forEach(function(object){
			annotations.push({
				id: object.id,
				type: object.type,
				page: index,
				x: object.normalLeft,
				y: object.normalTop,
				color: object.fill,
				content: object.text,
				fontSize: object.normalFontSize
			  });
		});
	});

	console.log(annotations);
	return JSON.stringify(annotations);
}

PDFAnnotate.prototype.loadFromJSON = function(jsonData) {
	var inst = this;
	//remove all annotations
	$.each(inst.fabricObjects, function (index, fabricObj) {
		fabricObj.remove(...fabricObj.getObjects());
	})

	const annotations = jsonData.map(function(object){
		return {
			id: object.id,
			type: object.type,
			page: object.page,
			normalLeft: object.x,
			normalTop: object.y,
			fill: object.color,
			text: object.content,
			normalFontSize: object.fontSize,
			left: object.x * inst.scale,
			top: object.y * inst.scale,
			fontSize: object.fontSize * inst.scale,
			hasControls: false
		  }
	});

	annotations.forEach(function(annotation){
		let pageIndex = annotation.page;
		inst.fabricObjects[pageIndex].add(new fabric.IText('', annotation));
 	});


}

PDFAnnotate.prototype.saveToFullJSON = function() {
	var inst = this;
	const array = inst.fabricObjects.map(fabricObject => {
		return fabricObject.toJSON(["id", "normalLeft", "normalTop", "normalFontSize", "hasControls"]);
	})
	return JSON.stringify(array);
}

PDFAnnotate.prototype.loadFromFullJSON = function(jsonData) {
	var inst = this;

	//remove all annotations
	$.each(inst.fabricObjects, function (index, fabricObj) {
		fabricObj.remove(...fabricObj.getObjects());
	})
	
	$.each(inst.fabricObjects, function (index, fabricObj) {
		if (jsonData.length > index) {
			//remove backgroundImage
			jsonData[index].backgroundImage = null;

			//set scale to objects
			jsonData[index].objects.forEach(function(object){
				object.left = object.normalLeft * inst.scale;
				object.top = object.normalTop * inst.scale;
				object.fontSize = object.normalFontSize * inst.scale;
			});

			fabricObj.loadFromJSON(jsonData[index], function () {
				inst.fabricObjectsData[index] = fabricObj.toJSON()
			})
		}
	})
}
