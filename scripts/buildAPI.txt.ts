import qs from "qs";
import * as z from "zod";

function buildClientFunction<
  TInput extends z.ZodTypeAny,
  TOutput extends z.ZodTypeAny,
>(endpoint: {
  readonly method: string;
  readonly name: string;
  readonly action: string;
  readonly filename: string;
  readonly InputType: TInput;
  readonly OutputType: TOutput;
}) {
  return async (input: z.infer<TInput>): Promise<z.infer<TOutput>> => {
    const validated = endpoint.InputType.parse(input); // runtime validation

    const queryString = qs.stringify(validated);
    const url = `/.netlify/functions/${endpoint.filename}${queryString ? `?${queryString}` : ""}`;

    const res = await fetch(url, {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: endpoint.method !== "GET" ? JSON.stringify(validated) : undefined,
    });

    const json = await res.json();
    const errorMessageFinal = `${endpoint.name}.${endpoint.action} server message: ${json.message}`;
    if (!res.ok) {
      console.error(errorMessageFinal);
      throw new Error(errorMessageFinal);
    }
    return endpoint.OutputType.parse(json); // validate response shape too
  };
}

// API_OBJECT_PLACEHOLDER
