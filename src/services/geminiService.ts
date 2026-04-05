import { Question } from "../types";
import { officialQuestions } from "../data/questions";

export async function getQuizQuestions(): Promise<Question[]> {
  // Return the official questions provided by the user
  return officialQuestions;
}
