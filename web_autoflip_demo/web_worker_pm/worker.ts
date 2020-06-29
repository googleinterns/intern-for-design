/**
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

/** Sends output data back to main script. */
onmessage = function (e: MessageEvent) {
  const ctx: Worker = self as any;
  console.log('Worker: video received from main');
  console.log(e.data);
  console.log('Worker: Posting data back to main');
  ctx.postMessage(e.data);
};
