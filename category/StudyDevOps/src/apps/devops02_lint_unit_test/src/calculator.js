export function add(left, right) {
  return left + right
}

export function divide(left, right) {
  if (right === 0) {
    throw new Error('division by zero')
  }
  return left / right
}
