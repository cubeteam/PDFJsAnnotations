var pdf = new PDFAnnotate("pdf.pdf", {
  onPageUpdated(page, oldData, newData) {
    console.log(page, oldData, newData);
  },
  ready() {
    console.log("Plugin initialized successfully");
  },
  scale: "fit",
  pageImageCompression: "MEDIUM", // FAST, MEDIUM, SLOW(Helps to control the new PDF file size)
  container_id: "pdf-container",
  component_id: "my-pdf-viewer",
  toolbar_id: "toolbar",
  readOnly: false,

  onAnnotationCreate: function () {
    console.log("create");
  },
  onAnnotationUpdate: function () {
    console.log("udpate");
  },
  onAnnotationDelete: function () {
    console.log("delete");
  },
});

function changeActiveTool(event) {
  var element = $(event.target).hasClass("tool-button")
    ? $(event.target)
    : $(event.target).parents(".tool-button").first();
  $(".tool-button.active").removeClass("active");
  $(element).addClass("active");
}

function enableSelector(event) {
  event.preventDefault();
  changeActiveTool(event);
  pdf.enableSelector();
}

function enablePencil(event) {
  event.preventDefault();
  changeActiveTool(event);
  pdf.enablePencil();
}

function enableAddText(event) {
  event.preventDefault();
  changeActiveTool(event);
  pdf.enableAddText();
}

function deleteSelectedObject(event) {
  event.preventDefault();
  pdf.deleteSelectedObject();
}

function savePDF() {
  let json = pdf.saveToJSON();
  pdf.loadFromJSON(JSON.parse(json));
}

function clearPage() {
  pdf.clearActivePage();
}

function showPdfData() {
  var string = pdf.serializePdf();
  $("#dataModal .modal-body pre").first().text(string);
  PR.prettyPrint();
  $("#dataModal").modal("show");
}

$(function () {
  $(".color-tool").click(function () {
    $(".color-tool.active").removeClass("active");
    $(this).addClass("active");
    color = $(this).get(0).style.backgroundColor;
    pdf.setColor(color);
  });

  $("#brush-size").change(function () {
    var width = $(this).val();
    pdf.setBrushSize(width);
  });

  $("#font-size").change(function () {
    var font_size = $(this).val();
    pdf.setFontSize(font_size);
  });
});

// ** my own script

function zoomIn(event) {
  pdf.zoomIn();
}

function zoomOut(event) {
  pdf.zoomOut();
}

function fitPage(event) {
  pdf.fit();
}

function nextPage(event) {
  pdf.nextPage();
}

function previousPage(event) {
  pdf.previousPage();
}
