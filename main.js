// main.js – Enhanced paste handling and pagination cleanup
function saveText() {
  const text = document.getElementById("editorContainer").innerText;
  const blob = new Blob([text], { type: "text/plain" });
  const link = document.createElement("a");
  let fileName = prompt("Enter file name:", "document");
  if (!fileName) return;
  link.href = URL.createObjectURL(blob);
  link.download = fileName + ".txt";
  link.click();
}

function exportPDF() {
  const container = document.getElementById("editorContainer");
  const cloned = container.cloneNode(true);

  // Remove empty pages in the cloned output
  const pages = cloned.querySelectorAll(".page");
  pages.forEach((page) => {
    const textContent = page.textContent.trim();
    const hasContent =
      textContent.length > 0 || page.querySelector("img, table, pre, code");
    if (!hasContent) page.remove();
  });

  const fileName = prompt("Enter file name:", "document");
  if (!fileName) return;

  const opt = {
    margin: 0.5,
    filename: fileName + ".pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
  };

  html2pdf().set(opt).from(cloned).save();
}

function changeFont() {
  const selectedFont = document.getElementById("fontSelector").value;
  document.querySelectorAll(".page").forEach((page) => {
    page.style.fontFamily = selectedFont;
  });
}

function changeFontSize() {
  const selectedSize = document.getElementById("fontSizeSelector").value;
  document.querySelectorAll(".page").forEach((page) => {
    page.style.fontSize = selectedSize;
  });
}

function toggleBold() {
  document.execCommand("bold");
}
function toggleItalic() {
  document.execCommand("italic");
}
function toggleUnderline() {
  document.execCommand("underline");
}

function changeTextColor() {
  const selectedColor = document.getElementById("textColor").value;
  document.execCommand("foreColor", false, selectedColor);
}

function alignText(alignment) {
  document.execCommand("justify" + alignment);
}

function insertOrderedList() {
  document.execCommand("insertOrderedList");
}
function insertUnorderedList() {
  document.execCommand("insertUnorderedList");
}

function insertImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.execCommand("insertImage", false, e.target.result);
    };
    reader.readAsDataURL(file);
  }
}

function insertTable() {
  let rows = prompt("Enter number of rows:", 3);
  let cols = prompt("Enter number of columns:", 3);
  if (rows && cols) {
    rows = parseInt(rows);
    cols = parseInt(cols);
    if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1) {
      alert("Invalid input. Please enter valid numbers.");
      return;
    }
    let table =
      "<table border='1' style='border-collapse: collapse; width: 100%;'>";
    for (let i = 0; i < rows; i++) {
      table += "<tr>";
      for (let j = 0; j < cols; j++) {
        table +=
          "<td style='padding: 10px; border: 1px solid black;'>Cell</td>";
      }
      table += "</tr>";
    }
    table += "</table><br>";
    document.execCommand("insertHTML", false, table);
  }
}

function insertCodeBlock() {
  const code = prompt("Paste your code:");
  if (!code) return;
  const language = document.getElementById("languageSelector").value;
  const pre = document.createElement("pre");
  const codeEl = document.createElement("code");
  codeEl.className = `language-${language}`;
  codeEl.textContent = code;
  codeEl.contentEditable = true;
  pre.appendChild(codeEl);
  const wrapper = document.createElement("div");
  wrapper.contentEditable = false;
  wrapper.appendChild(pre);
  const range = window.getSelection().getRangeAt(0);
  range.deleteContents();
  range.insertNode(wrapper);
  setTimeout(() => {
    Prism.highlightElement(codeEl);
    checkPageOverflow();
  }, 0);
  codeEl.addEventListener("blur", () => {
    setTimeout(() => Prism.highlightElement(codeEl), 100);
  });
}

function createNewPage() {
  let newPage = document.createElement("div");
  newPage.className = "page";
  newPage.contentEditable = true;
  return newPage;
}

function checkPageOverflow() {
  const pages = document.querySelectorAll(".page");
  pages.forEach((page) => {
    if (page.scrollHeight > page.clientHeight) {
      // Move overflowing content to a new page
      const children = Array.from(page.childNodes);
      let nextPage = page.nextElementSibling;
      if (!nextPage || !nextPage.classList.contains("page")) {
        nextPage = createNewPage();
        page.parentNode.insertBefore(nextPage, page.nextSibling);
      }
      while (page.scrollHeight > page.clientHeight && children.length) {
        const last = children.pop();
        if (last) nextPage.insertBefore(last, nextPage.firstChild);
      }
    }
  });
  // Remove any empty pages except the first
  const allPages = document.querySelectorAll(".page");
  allPages.forEach((page, index) => {
    const isEmpty =
      page.innerText.trim().length === 0 &&
      !page.querySelector("img, table, pre, code");
    if (isEmpty && index !== 0) {
      page.remove();
    }
  });
}

// Handle paste event to preserve formatting
document
  .getElementById("editorContainer")
  .addEventListener("paste", function (e) {
    e.preventDefault();
    e.stopPropagation();
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;
    const htmlData = clipboardData.getData("text/html");
    const textData = clipboardData.getData("text/plain");
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const anchorNode = range.startContainer;
    const anchorElement =
      anchorNode.nodeType === Node.ELEMENT_NODE
        ? anchorNode
        : anchorNode.parentElement;
    const inCodeBlock = anchorElement && anchorElement.closest("code");

    if (inCodeBlock) {
      // Paste as plain text inside code blocks
      if (textData) {
        document.execCommand("insertText", false, textData);
      } else if (htmlData) {
        // Strip all HTML tags and insert text only
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlData;
        const plainText = tempDiv.textContent || tempDiv.innerText || "";
        document.execCommand("insertText", false, plainText);
      }
    } else if (htmlData) {
      // Insert rich HTML content at cursor
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlData, "text/html");
      const fragmentHtml = doc.body.innerHTML;
      if (typeof insertHTML === "function") {
        insertHTML(fragmentHtml);
      } else {
        document.execCommand("insertHTML", false, fragmentHtml);
      }
    } else if (textData) {
      // Insert plain text (preserve line breaks)
      if (typeof insertTextPreserveLines === "function") {
        insertTextPreserveLines(textData);
      } else {
        document.execCommand("insertText", false, textData);
      }
    }

    // Re-highlight any newly inserted code blocks
    document.querySelectorAll("pre code").forEach((codeEl) => {
      if (
        codeEl.className.startsWith("language-") &&
        !codeEl.querySelector(".token")
      ) {
        Prism.highlightElement(codeEl);
      }
    });

    // Re-check overflow and remove blank pages after paste
    checkPageOverflow();
    const pages = document.querySelectorAll(".page");
    pages.forEach((page, index) => {
      const isEmpty =
        page.innerText.trim().length === 0 &&
        !page.querySelector("img, table, pre, code");
      if (isEmpty && index !== 0) {
        page.remove();
      }
    });
  });

function insertHTML(html) {
  let selection = window.getSelection();
  if (!selection.rangeCount) return;
  let range = selection.getRangeAt(0);
  range.deleteContents();
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  const frag = document.createDocumentFragment();
  let node;
  while ((node = tempDiv.firstChild)) {
    frag.appendChild(node);
  }
  range.insertNode(frag);
  checkPageOverflow();
}

function insertTextPreserveLines(text) {
  let selection = window.getSelection();
  let range = selection.getRangeAt(0);
  let lines = text.split(/\r?\n/);
  for (let line of lines) {
    range.insertNode(document.createTextNode(line));
    range.insertNode(document.createElement("br"));
  }
  checkPageOverflow();
}

function moveCursorToPage(page) {
  page.focus();
  let range = document.createRange();
  let selection = window.getSelection();
  range.selectNodeContents(page);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function openTextFile() {
  let input = document.createElement("input");
  input.type = "file";
  input.accept = ".txt";
  input.addEventListener("change", function () {
    let file = input.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function (e) {
      loadTextIntoEditor(e.target.result);
    };
    reader.readAsText(file);
  });
  input.click();
}

function loadTextIntoEditor(text) {
  let editor = document.getElementById("editorContainer");
  editor.innerHTML = "";
  let newPage = createNewPage();
  editor.appendChild(newPage);
  let paragraphs = text.split("\n");
  paragraphs.forEach((line) => {
    let p = document.createElement("p");
    p.textContent = line || "\u200B";
    newPage.appendChild(p);
  });
  checkPageOverflow();
}
