const BASE_SIZE_CODE = 520; // 3.5
const BASE_SIZE = 3.5;

// https://github.com/theriley106/SneakerBotTutorials/blob/master/main.py#L11
export function getSizeCode(desiredSize: Number): Number {
  let size = desiredSize - BASE_SIZE;
  size *= 20;
  const sizeCode = size + BASE_SIZE_CODE;
  return parseInt(sizeCode, 10); // radix of 10
}