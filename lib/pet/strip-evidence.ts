/**
 * evidence 双重剥离 —— 服务端二线防御
 *
 * 前端 paste 时已经剥离一次，这里在入库前再剥一次：
 * 防御场景：恶意客户端绕过前端直接 POST 带 evidence 的 JSON
 *
 * 接受 pet-shape object，返回深拷贝且 generation_evidence 字段移除
 */
export function stripEvidence<T extends Record<string, unknown>>(pet: T): Omit<T, 'generation_evidence'> {
  const { generation_evidence: _omit, ...rest } = pet as T & { generation_evidence?: unknown };
  return rest;
}
