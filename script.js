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

function enableAddText(event) {
  event.preventDefault();
  changeActiveTool(event);
  pdf.enableAddText();
}

function deleteSelectedObject(event) {
  event.preventDefault();
  pdf.deleteSelectedObject();
}

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
