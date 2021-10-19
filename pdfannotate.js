/**
 * PDFAnnotate v1.0.1
 * Author: Ravisha Heshan
 */
(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define(["fabric", "pdfjs-dist/build/pdf"], factory);
  } else if (typeof exports === "object") {
    module.exports = factory(
      require("fabric"),
      require("pdfjs-dist/build/pdf")
    );
  } else {
    root.PDFAnnotate = factory(root.fabric, root.pdfjsLib);
  }
})(this, function (fabric, pdfjsLib) {
  // this is where I defined my module implementation

  fabric.IText.prototype.defRender = fabric.IText.prototype.render;
  fabric.IText.prototype.render = function (ctx) {
    this.clearContextTop();
    this.defRender(ctx);
    this.cursorOffsetCache = {};
    this.renderCursorOrSelection();
    ctx.strokeStyle = "#528cbd";
    ctx.lineWidth = 1;
    let coords = this.calcCoords();
    ctx.beginPath();
    ctx.moveTo(coords.tl.x, coords.tl.y);
    ctx.lineTo(coords.tr.x, coords.tr.y);
    ctx.lineTo(coords.br.x, coords.br.y);
    ctx.lineTo(coords.bl.x, coords.bl.y);
    ctx.closePath();
    ctx.stroke();
  };

  let PDFAnnotate = function (url, options = {}) {
    this.optionsFabric = {
      number_of_pages: 0,
      pages_rendered: 0,
      active_tool: 1, // 1 - Free hand, 2 - Text, 3 - Edit Text
      fabricObjects: [],
      fabricObjectsData: [],
      color: "#528cbd",
      borderSize: 1,
      font_size: 16,
      padding: 2,
      active_canvas: 0,
    };
    this.optionsCubeTeam = {
      //dom id
      container_id: "",
      component_id: "",

      //scale; <int || fit>
      scale: 1,
      scaleMIN: 0.1,
      scaleMAX: 5,

      //step
      step: 0.1,

      //mode
      readOnly: true,

      //controls settings
      controlColor: "#000000",

      //calback functions
      onAnnotationCreate: function () {},
      onAnnotationUpdate: function () {},
      onAnnotationDelete: function () {},
    };

    var inst = this;

    //loadPDF on startup
    var loadingTask = pdfjsLib.getDocument(url);
    loadingTask.promise.then(
      function (pdf) {
        inst.pdf = pdf;
        inst.render(options);
      },
      function (reason) {
        console.error(reason);
      }
    );

    this.setOptions = function (options) {
      if (options.optionsFabric)
        Object.assign(this.optionsFabric, options.optionsFabric);
      if (options.optionsCubeTeam)
        Object.assign(this.optionsCubeTeam, options.optionsCubeTeam);
    };

    this.getFirstPage = function () {
      return new Promise(function (resolve) {
        inst.pdf.getPage(1).then(resolve);
      });
    };

    this.zoomIn = function () {
      this.render({
        optionsCubeTeam: {
          scale: this.optionsCubeTeam.scale + this.optionsCubeTeam.step,
        },
      });
    };

    this.zoomOut = function () {
      this.render({
        optionsCubeTeam: {
          scale: this.optionsCubeTeam.scale - this.optionsCubeTeam.step,
        },
      });
    };

    this.fit = function () {
      this.render({
        optionsCubeTeam: {
          scale: "fit",
        },
      });
    };

    this.getCurrentPage = function () {
      const component = document.getElementById(
        this.optionsCubeTeam.component_id
      );
      const scrollTop = component.scrollTop + 10;

      const page = document.getElementsByClassName("canvas-container")[0];
      const style = page.currentStyle || window.getComputedStyle(page);
      const pageContainerMargin = parseInt(
        style.marginBottom.replace("px", "")
      );
      const pageHeight = page.offsetHeight + pageContainerMargin;
      return Math.floor(scrollTop / pageHeight);
    };

    this.hasPageScrollOffset = function () {
      const component = document.getElementById(
        this.optionsCubeTeam.component_id
      );

      const page = document.getElementsByClassName("canvas-container")[0];
      const style = page.currentStyle || window.getComputedStyle(page);
      const pageContainerMargin = parseInt(
        style.marginBottom.replace("px", "")
      );
      const pageHeight = page.offsetHeight + pageContainerMargin;
      return component.scrollTop % pageHeight > 10;
    };

    this.nextPage = function () {
      const currentPage = this.getCurrentPage();
      if (currentPage + 1 < this.optionsFabric.number_of_pages) {
        const component = document.getElementById(
          this.optionsCubeTeam.component_id
        );
        const page = document.getElementsByClassName("canvas-container")[0];
        const style = page.currentStyle || window.getComputedStyle(page);
        const pageContainerMargin = parseInt(
          style.marginBottom.replace("px", "")
        );
        const pageHeight = page.offsetHeight + pageContainerMargin;
        component.scrollTop = (currentPage + 1) * pageHeight + 10;
      }
    };

    this.previousPage = function () {
      let currentPage = this.getCurrentPage();
      if (!this.hasPageScrollOffset()) currentPage -= 1;

      const component = document.getElementById(
        this.optionsCubeTeam.component_id
      );
      const page = document.getElementsByClassName("canvas-container")[0];
      const style = page.currentStyle || window.getComputedStyle(page);
      const pageContainerMargin = parseInt(
        style.marginBottom.replace("px", "")
      );
      const pageHeight = page.offsetHeight + pageContainerMargin;
      component.scrollTop = currentPage * pageHeight + 10;
    };

    this.render = async function (options) {
      this.setOptions(options);
      const pdf = this.pdf;

      const json = this._export();
      this.optionsFabric.pages_rendered = 0;
      this.optionsFabric.fabricObjects = [];

      const container = document.getElementById(
        inst.optionsCubeTeam.container_id
      );
      const component = document.getElementById(
        inst.optionsCubeTeam.component_id
      );
      container.innerHTML = "";
      const componentHeight = component.clientHeight;

      if (this.optionsCubeTeam.scale == "fit") {
        const page = await this.getFirstPage();
        this.optionsCubeTeam.scale = componentHeight / page._pageInfo.view[3];
      } else if (this.optionsCubeTeam.scale > this.optionsCubeTeam.scaleMAX)
        this.optionsCubeTeam.scale = this.optionsCubeTeam.scaleMAX;
      else if (this.optionsCubeTeam.scale < this.optionsCubeTeam.scaleMIN)
        this.optionsCubeTeam.scale = this.optionsCubeTeam.scaleMIN;

      inst.optionsFabric.number_of_pages = pdf.numPages;

      for (var i = 1; i <= pdf.numPages; i++) {
        pdf.getPage(i).then(function (page) {
          var viewport = page.getViewport({
            scale: inst.optionsCubeTeam.scale,
          });
          var canvas = document.createElement("canvas");
          container.appendChild(canvas);
          canvas.className = "pdf-canvas";
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          context = canvas.getContext("2d");

          var renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          var renderTask = page.render(renderContext);
          renderTask.promise.then(function () {
            $(".pdf-canvas").each(function (index, el) {
              $(el).attr("id", "page-" + (index + 1) + "-canvas");
            });
            inst.optionsFabric.pages_rendered++;
            if (
              inst.optionsFabric.pages_rendered ==
              inst.optionsFabric.number_of_pages
            ) {
              inst.initFabric();
              if (json) inst._import(json);
            }
          });
        });
      }
    };

    this.initFabric = function () {
      var inst = this;
      let canvases = $("#" + inst.optionsCubeTeam.container_id + " canvas");
      canvases.each(function (index, el) {
        var background = el.toDataURL("image/png");
        var fabricObj = new fabric.Canvas(el.id, {
          freeDrawingBrush: {
            width: 1,
            color: inst.optionsFabric.color,
          },
          selection: false,
        });

        inst.optionsFabric.fabricObjects.push(fabricObj);
        if (typeof options.onPageUpdated == "function") {
          fabricObj.on("object:added", function () {
            var oldValue = Object.assign(
              {},
              inst.optionsFabric.fabricObjectsData[index]
            );
            inst.optionsFabric.fabricObjectsData[index] = fabricObj.toJSON();
            options.onPageUpdated(
              index + 1,
              oldValue,
              inst.optionsFabric.fabricObjectsData[index]
            );
          });
        }
        fabricObj.setBackgroundImage(
          background,
          fabricObj.renderAll.bind(fabricObj)
        );
        $(fabricObj.upperCanvasEl).click(function (event) {
          inst.optionsFabric.active_canvas = index;
          inst.fabricClickHandler(event, fabricObj);
        });
        fabricObj.on("after:render", function () {
          inst.optionsFabric.fabricObjectsData[index] = fabricObj.toJSON();
          fabricObj.off("after:render");
        });
        fabricObj.on("selection:created", function (event) {
          if (inst.optionsFabric.active_tool == 3) {
            event.target.enterEditing();
            event.target.setSelectionStart(event.target.text.length);
            event.target.setSelectionEnd(event.target.text.length);
          }
        });
        fabricObj.on("object:modified", function (event) {
          const annotation = event.target;
          annotation.normalLeft = annotation.left / inst.optionsCubeTeam.scale;
          annotation.normalTop = annotation.top / inst.optionsCubeTeam.scale;
          annotation.normalFontSize =
            annotation.fontSize / inst.optionsCubeTeam.scale;

          const json = inst.exportAnnotation(annotation.id);
          inst.optionsCubeTeam.onAnnotationUpdate(json);
        });

        if (
          index === canvases.length - 1 &&
          typeof options.ready === "function"
        ) {
          options.ready();
        }
      });
    };

    this.fabricClickHandler = function (event, fabricObj) {
      var inst = this;

      if (inst.optionsFabric.active_tool == 2) {
        const text = new fabric.IText("", {
          left:
            event.clientX -
            fabricObj.upperCanvasEl.getBoundingClientRect().left,
          top:
            event.clientY - fabricObj.upperCanvasEl.getBoundingClientRect().top,
          fill: inst.optionsFabric.color,
          fontSize: inst.optionsFabric.font_size * inst.optionsCubeTeam.scale,
          selectable: true,
          hasRotatingPoint: false,
          id: Date.now(),
          normalTop: 0,
          normalLeft: 0,
          normalFontSize: 0,
          hasControls: false,
          selectable: !inst.optionsCubeTeam.readOnly,
          borderColor: inst.optionsCubeTeam.controlColor,
          padding: inst.optionsFabric.padding,
        });

        text.normalLeft = text.left / inst.optionsCubeTeam.scale;
        text.normalTop = text.top / inst.optionsCubeTeam.scale;
        text.normalFontSize = text.fontSize / inst.optionsCubeTeam.scale;

        text.enterEditing();

        fabricObj.add(text);
        const json = this.exportAnnotation(text.id);
        this.optionsCubeTeam.onAnnotationCreate(json);
      }
    };
  };

  PDFAnnotate.prototype.disableITextEditing = function () {
    var inst = this;

    inst.optionsFabric.fabricObjects.forEach(function (obj) {
      obj._objects.forEach(function (iText) {
        if (iText.isEditing) iText.exitEditing();
      });
    });
  };

  PDFAnnotate.prototype.enableSelector = function () {
    var inst = this;
    inst.disableITextEditing();
    inst.optionsFabric.active_tool = 0;
    if (inst.optionsFabric.fabricObjects.length > 0) {
      $.each(inst.optionsFabric.fabricObjects, function (index, fabricObj) {
        fabricObj.isDrawingMode = false;
      });
    }
  };

  PDFAnnotate.prototype.enableAddText = function () {
    var inst = this;
    inst.disableITextEditing();
    inst.optionsFabric.active_tool = 2;
    if (inst.optionsFabric.fabricObjects.length > 0) {
      $.each(inst.optionsFabric.fabricObjects, function (index, fabricObj) {
        fabricObj.isDrawingMode = false;
      });
    }
  };

  PDFAnnotate.prototype.enableEditText = function () {
    var inst = this;
    inst.disableITextEditing();
    inst.optionsFabric.active_tool = 3;
    if (inst.optionsFabric.fabricObjects.length > 0) {
      $.each(inst.optionsFabric.fabricObjects, function (index, fabricObj) {
        fabricObj.isDrawingMode = false;
      });
    }
  };

  PDFAnnotate.prototype.getSelectedObject = function () {
    return this.optionsFabric.fabricObjects[
      this.optionsFabric.active_canvas
    ].getActiveObject();
  };

  PDFAnnotate.prototype.deleteSelectedObject = function () {
    const activeObject = this.getSelectedObject();
    if (!activeObject) return;

    const id = activeObject.id;
    if (confirm("Are you sure ?")) {
      const json = this.exportAnnotation(id);
      this.optionsFabric.fabricObjects[this.optionsFabric.active_canvas].remove(
        activeObject
      );
      this.optionsCubeTeam.onAnnotationDelete(json);
    }
  };

  PDFAnnotate.prototype.deleteAllObjects = function () {
    var inst = this;
    if (confirm("Are you sure ?")) {
      inst.optionsFabric.fabricObjects.forEach(function (page) {
        page.remove(...page.getObjects());
      });
    }
  };

  PDFAnnotate.prototype.setBrushSize = function (size) {
    var inst = this;
    $.each(inst.optionsFabric.fabricObjects, function (index, fabricObj) {
      fabricObj.freeDrawingBrush.width = size;
    });
  };

  PDFAnnotate.prototype.setColor = function (color) {
    var inst = this;
    inst.optionsFabric.color = color;
    $.each(inst.optionsFabric.fabricObjects, function (index, fabricObj) {
      fabricObj.freeDrawingBrush.color = color;
    });
  };

  PDFAnnotate.prototype.setFontSize = function (size) {
    this.optionsFabric.font_size = size;
  };

  PDFAnnotate.prototype.setBorderSize = function (size) {
    this.optionsFabric.borderSize = size;
  };

  PDFAnnotate.prototype._export = function () {
    var inst = this;
    const array = inst.optionsFabric.fabricObjects.map((fabricObject) => {
      return fabricObject.toJSON([
        "id",
        "normalLeft",
        "normalTop",
        "normalFontSize",
      ]);
    });
    return array;
  };

  PDFAnnotate.prototype.exportAnnotation = function (annotationId) {
    const annotations = this.export();

    return annotations.find(function (annotation) {
      return annotation.id === annotationId;
    });
  };

  PDFAnnotate.prototype.export = function () {
    var inst = this;
    const array = inst.optionsFabric.fabricObjects.map(function (fabricObject) {
      return fabricObject.toJSON([
        "id",
        "normalLeft",
        "normalTop",
        "normalFontSize",
        "padding",
        "height",
        "width",
      ]);
    });
    const annotations = [];
    array.forEach(function (page, index) {
      page.objects.forEach(function (object) {
        annotations.push({
          id: object.id,
          type: object.type,
          page: index,
          x: object.normalLeft,
          y: object.normalTop,
          color: object.fill,
          content: object.text,
          fontSize: object.normalFontSize,
          padding: object.padding,
          pageWidth: page.width / inst.optionsCubeTeam.scale,
          pageHeight: page.height / inst.optionsCubeTeam.scale,
        });
      });
    });

    return annotations;
  };

  PDFAnnotate.prototype.import = function (jsonData) {
    var inst = this;
    //remove all annotations
    $.each(inst.optionsFabric.fabricObjects, function (index, fabricObj) {
      fabricObj.remove(...fabricObj.getObjects());
    });

    const annotations = jsonData.map(function (object) {
      return {
        id: object.id,
        type: object.type,
        page: object.page,
        normalLeft: object.x,
        normalTop: object.y,
        fill: object.color,
        text: object.content,
        normalFontSize: object.fontSize,
        left: object.x * inst.optionsCubeTeam.scale,
        top: object.y * inst.optionsCubeTeam.scale,
        fontSize: object.fontSize * inst.optionsCubeTeam.scale,
        hasControls: false,
        selectable: !inst.optionsCubeTeam.readOnly,
        borderColor: inst.optionsCubeTeam.controlColor,
        padding: object.padding,
      };
    });

    annotations.forEach(function (annotation) {
      let pageIndex = annotation.page;
      inst.optionsFabric.fabricObjects[pageIndex].add(
        new fabric.IText("", annotation)
      );
    });
  };

  PDFAnnotate.prototype._import = function (jsonData) {
    var inst = this;

    //remove all annotations
    $.each(inst.optionsFabric.fabricObjects, function (index, fabricObj) {
      fabricObj.remove(...fabricObj.getObjects());
    });

    $.each(inst.optionsFabric.fabricObjects, function (index, fabricObj) {
      if (jsonData.length > index) {
        //remove backgroundImage
        jsonData[index].backgroundImage = null;

        //set properties to objects
        jsonData[index].objects.forEach(function (object) {
          object.left = object.normalLeft * inst.optionsCubeTeam.scale;
          object.top = object.normalTop * inst.optionsCubeTeam.scale;
          object.fontSize = object.normalFontSize * inst.optionsCubeTeam.scale;
          object.selectable = !inst.optionsCubeTeam.readOnly;
          object.borderColor = inst.optionsCubeTeam.controlColor;
          object.hasControls = false;
        });

        fabricObj.loadFromJSON(jsonData[index], function () {
          inst.optionsFabric.fabricObjectsData[index] = fabricObj.toJSON();
        });
      }
    });
  };

  return PDFAnnotate;
});
