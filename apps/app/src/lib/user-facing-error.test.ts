import assert from "node:assert/strict";
import test from "node:test";
import { userFacingError } from "./user-facing-error.js";

test("translates known API errors for the Chinese interface", () => {
  assert.equal(userFacingError("Password must be at least 8 characters.", "zh-CN"), "密码至少需要 8 个字符。");
  assert.equal(userFacingError("Invalid email or password.", "zh-CN"), "邮箱或密码不正确，请检查后重试。");
  assert.equal(userFacingError("Activation code not found.", "zh-CN"), "未找到这个激活码，请检查是否输入完整，或联系支持核查。");
  assert.equal(userFacingError("An active entitlement is required.", "zh-CN"), "此功能需要有效权限，请先完成开通。");
});

test("does not leak an unknown English diagnostic into the Chinese primary message", () => {
  assert.equal(userFacingError("Unexpected parser internals", "zh-CN"), "操作未完成，请稍后重试。");
  assert.equal(userFacingError("自定义中文错误", "zh-CN"), "自定义中文错误");
});
