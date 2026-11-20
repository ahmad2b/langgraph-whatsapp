// Adapted from langchain-ai/react-agent-js (MIT); see THIRD_PARTY_NOTICES.md.
import { tool } from "langchain";
import { z } from "zod";

export const calculator = tool(
  ({ operation, a, b }) => {
    switch (operation) {
      case "add":
        return String(a + b);
      case "subtract":
        return String(a - b);
      case "multiply":
        return String(a * b);
      case "divide":
        return b === 0 ? "Cannot divide by zero." : String(a / b);
    }
  },
  {
    name: "calculator",
    description: "Calculate using two numbers and add, subtract, multiply, or divide.",
    schema: z.object({
      operation: z.enum(["add", "subtract", "multiply", "divide"]),
      a: z.number().finite(),
      b: z.number().finite(),
    }),
  },
);
