import React from "react";
import { Header } from "./components/Header";
import { html } from "./content/terms.md";

export const Terms: React.FC = () => {
  return (
    <div>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-20 prose prose-sm sm:prose">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </main>
    </div>
  );
};
