import assert from "node:assert/strict";
import test from "node:test";
import { userFacingError } from "./user-facing-error.js";

test("translates known API errors for the Chinese interface", () => {
  assert.equal(userFacingError("Password must be at least 8 characters.", "zh-CN"), "密码至少需要 8 个字符。");
  assert.equal(userFacingError("Invalid email or password.", "zh-CN"), "邮箱或密码不正确，请检查后重试。");
  assert.equal(userFacingError("Google sign-in could not be verified. Please try again.", "zh-CN"), "Google 登录验证失败，请重新选择账号后再试。");
  assert.equal(userFacingError("Activation code not found.", "zh-CN"), "未找到这个激活码，请检查是否输入完整，或联系支持核查。");
  assert.equal(userFacingError("An active entitlement is required.", "zh-CN"), "此功能需要有效权限，请先完成开通。");
  assert.equal(userFacingError("The monthly credit balance for this plan has been used up.", "zh-CN"), "本月积分已用完，请等待下月重置或升级积分套餐。");
  assert.equal(userFacingError("The monthly processing quota for this plan has been reached.", "zh-CN"), "本月积分已用完，请等待下月重置或升级积分套餐。");
});

test("does not leak an unknown English diagnostic into the Chinese primary message", () => {
  assert.equal(userFacingError("Unexpected parser internals", "zh-CN"), "操作未完成，请稍后重试。");
  assert.equal(userFacingError("自定义中文错误", "zh-CN"), "自定义中文错误");
});
