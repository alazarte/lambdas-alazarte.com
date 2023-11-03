// TODO I don't like this
const defaultContainer = "uploadFileContainer";
const allContainers = ["uploadFileContainer", "uploadSnippetContainer"];

function clearLog() {
  const progressDiv = document.getElementById("progress");
  progressDiv.innerHTML = "";
}

function log(msg) {
  const progressDiv = document.getElementById("progress");
  if (progressDiv.innerHTML !== "") {
    progressDiv.innerHTML += "<br>";
  }
  progressDiv.innerHTML += msg;
}

// TODO I think the code is a string
function renderError(code) {
  console.log("Parsing as number:", code);
  code = Number(code);
  console.log("Is it a number? ", code);
  switch(code) {
    case 200:
      return "File uploaded!";
    case 429:
      return "Wait before uploading a new file";
    case (code >= 500 && code < 600):
      return "Failed to upload file";
    default:
      return "There was an error somewhere";
  }
}

async function requestPresignedUrl(filename, filetype) {
  const requestUrlUrl = await fetch("https://alazarte.com/upload/url.txt")
    .then(response => response.text());
  console.log("requestUrlUrl=", requestUrlUrl);

  // TODO use json
  const formData = new FormData();
  formData.append("filename", filename);
  formData.append("mime", filetype);
  console.log("name:", filename);
  console.log("mime:", filetype);

  const response = await fetch(requestUrlUrl, {
    method: "POST",
    body: formData,
  });

  if(!response.ok) {
    const text = await response.text();
    log(renderError(response.code));
    return undefined;
  }

  const resText = await response.text();
  return resText.replaceAll(" ", "");
}

async function uploadObject(objectName, mimeType, objectContens) {
  log("Uploading...");

  let presignedUrl = undefined;
  try {
    presignedUrl = await requestPresignedUrl(objectName, mimeType);
    if (presignedUrl == undefined) {
      return false;
    }
    // TODO s3 adds '"' surrounding the url, find a better way to check this
    if (presignedUrl[0] == '"' && presignedUrl[presignedUrl.length-1] == '"') {
      presignedUrl = presignedUrl.substring(1, presignedUrl.length-1);
    }
    console.log("presignedUrl=", presignedUrl);
  } catch(err) {
    console.error(err);
    log("Upload failed");
  }

  try {
    if(!presignedUrl) {
      log("Upload failed, presigned url empty");
      return false;
    }

    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      body: objectContens,
      headers: new Headers({
        "content-type": mimeType,
      }),
    });

    if (uploadResponse.ok) {
      log("File uploaded!");
      return true;
    }
  } catch(err) {
    console.error(err);
    log("Upload failed: "+err);
  }
  return false;
}

async function uploadFile() {
  clearLog();

  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (!file) {
    return;
  }

  uploadObject(file.name, file.type, file);
}

async function uploadSnippet() {
  clearLog();

  const titleInput = document.getElementById("snippetTitleInput");
  const title = titleInput.value;

  const contentsInput = document.getElementById("snippetAreaInput");
  const contents = contentsInput.value;

  // TODO make this safe, I want all to be txt
  const filename = title + ".txt";

  const ok = uploadObject(filename, "text/raw", new File([new Blob([contents])], filename));
  if (ok) {
    titleInput.value = "";
    contentsInput.value = "";
  }
}

async function refreshFileList() {
  const response = await fetch("https://alazarte.com/upload/list.html", {
    cache: "no-cache",
  });
  document.getElementById("fileListDiv").innerHTML = await response.text();
}

function forceInput() {
  // TODO do I need to put this outside the function?
  // otherwise is constantly looking for these two elements
  const titleInput = document.getElementById("snippetTitleInput");
  titleInput.value = titleInput.value.replace(/[^a-z.]/g, "");
  log("Only lower chars without spaces");
}

function hideElement(evt) {
  for (const current of allContainers) {
    const cont = document.getElementById(current);
    console.log("in loop", current);
    cont.hidden = true;
  }

  let targetId = defaultContainer;
  if (evt) {
    targetId = evt.currentTarget.target;
  }
  const cont = document.getElementById(targetId);
  cont.hidden = false;
}

document.addEventListener("DOMContentLoaded", function() {
  const uploadFileButton = document.getElementById("uploadFileButton");
  const uploadSnippetButton = document.getElementById("uploadSnippetButton");
  const fileListRefreshButton = document.getElementById("fileListRefreshButton");

  const hideFileFormButton = document.getElementById("hideFileFormButton");
  const hideSnippetFormButton = document.getElementById("hideSnippetFormButton");

  uploadFileButton.addEventListener("click", uploadFile);
  uploadSnippetButton.addEventListener("click", uploadSnippet);
  fileListRefreshButton.addEventListener("click", refreshFileList);

  hideFileFormButton.addEventListener("click", hideElement, false);
  hideFileFormButton.target = "uploadFileContainer";

  hideSnippetFormButton.addEventListener("click", hideElement, false);
  hideSnippetFormButton.target = "uploadSnippetContainer";
});

hideElement(undefined);
