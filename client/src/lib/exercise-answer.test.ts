import { expect, it } from "vitest";
import { exerciseAnswerMatches } from "./exercise-answer";
it("grades the teacher's configured answer rather than a hardcoded word", () => {
  expect(exerciseAnswerMatches("واسعة", "وَاسِعَةٌ")).toBe(true);
  expect(exerciseAnswerMatches("جميلة", "وَاسِعَةٌ")).toBe(false);
});
it("permits optional marks and punctuation without accepting partial incorrect words", () => {
  expect(exerciseAnswerMatches("الولد ذهب إلى المدرسة.", "الْوَلَدُ ذَهَبَ إِلَى الْمَدْرَسَةِ")).toBe(true);
  expect(exerciseAnswerMatches("غير جميلة", "جميلة")).toBe(false);
});
