import React from "react";
import { Link } from "react-router";
import { Header } from "../components/Header";
import { getBlogPosts } from "../lib/blog";

export const Blog: React.FC = () => {
  const posts = getBlogPosts();

  return (
    <div>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-20">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Blog</h1>
        {posts.length === 0 ? (
          <p className="text-gray-500">No posts yet.</p>
        ) : (
          <div className="space-y-10">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="border-b border-gray-200 pb-8"
              >
                <Link
                  to={`/blog/${post.slug}`}
                  className="text-xl font-semibold text-teal-700 hover:underline"
                >
                  {post.title}
                </Link>
                {post.date && (
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(post.date).toLocaleDateString()}
                  </p>
                )}
                {post.excerpt && (
                  <p className="text-gray-700 mt-2">{post.excerpt}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
