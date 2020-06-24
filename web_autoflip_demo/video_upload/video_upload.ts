/*
Copyright 2020 Google LLC
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. 
*/

//check if browser supports file api and filereader features
if (window.File && window.FileReader && window.FileList && window.Blob) {
  // this function is called when the input loads a video
  function showVideo(): void {
    var file = (<HTMLInputElement>event.target).files[0];
    //grab the first video in the fileList
    //Currently, only loading one file
    console.log("video file has been chosen");
    console.log(file);
    renderVideo(file);
  }

  // this function is for displaying video content
  function renderVideo(file: any): void {
    var reader = new FileReader();
    reader.onload = function (event) {
      var the_url = event.target.result;
      // Using a template library like handlebars.js may be a better solution than just inserting a string
      document.getElementById("data-vid").innerHTML =
        "<video width='400' controls><source id='vid-source' src='" +
        the_url +
        "'type='video/mp4'></video>";
      document.getElementById("name-vid").innerHTML = file.name;
    };

    //when the file is read it triggers the onload event above.
    reader.readAsDataURL(file);
  }
} else {
  alert("The File APIs are not fully supported in this browser.");
}
