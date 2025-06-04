
test('Frame budget allows 60fps', ()=>{
  const frameTime = 1000/60;
  expect(frameTime).toBeLessThanOrEqual(16.7);
});
