import { addSectionFramestoIndexDB } from '../src/utils_indexDB';
import { readFramesFromIndexedDB } from '../src/utils_indexDB';
import { Frame } from '../src/interfaces';

test('write and read database', () => {
  let framesData = [];
  framesData.push({ name: 'test01', data: new ArrayBuffer(2), frameId: 100 });
  framesData.push({ name: 'test02', data: new ArrayBuffer(2), frameId: 101 });
  framesData.push({ name: 'test03', data: new ArrayBuffer(2), frameId: 102 });
  console.log(framesData);

  let videoId = 0;
  let workerId = 0;
  let user = { inputWidth: 1, inputHeight: 1 };

  let startId = 100;
  let frameNumber = 3;
  addSectionFramestoIndexDB(framesData, videoId, workerId, user);

  readFramesFromIndexedDB(videoId, startId, frameNumber)
    .then((frames: Frame[]) => {
      console.log(frames);
      expect(frames[0]).toBe({
        name: 'test02',
        data: new ArrayBuffer(2),
        frameId: 101,
      });
      expect(frames[1]).toBe({
        name: 'test01',
        data: new ArrayBuffer(2),
        frameId: 100,
      });
      expect(frames[2]).toBe({
        name: 'test01',
        data: new ArrayBuffer(2),
        frameId: 100,
      });
    })
    .catch(function () {
      console.log('Promise Rejected');
    });
});
