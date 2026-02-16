import React from "react";
import { Header } from "./components/Header";
import { html } from "./content/privacy.md";

export const Privacy: React.FC = () => {
  return (
    <div>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-20 prose prose-sm sm:prose">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </main>
    </div>
  );
};
