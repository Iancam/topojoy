import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { success, error } from "../lib";

/**
 * Faceted browse over public map tags.
 *
 * ?nodes=key1,key2 — maps whose union of tag assignments contains ALL of the
 * given node keys. The response includes `facets`: nodes that co-occur within
 * the result set, with counts, so the client can offer the next filter level
 * (e.g. selecting `colvig` surfaces `spruce`, `2026`, `2nd term`...).
 *
 * With no selection, returns recently tagged maps and the globally most-used
 * nodes.
 */
export const handler = async (event: any) => {
  if (event.httpMethod !== "GET") {
    return error("Method not allowed", 405);
  }

  try {
    const selected: string[] = (event.queryStringParameters?.nodes || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    const untagged = event.queryStringParameters?.untagged === "true";
    const q: string = (event.queryStringParameters?.q || "").trim();
    const searchWhere: Prisma.MapConfigWhereInput | undefined =
      q.length >= 2
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { filename: { contains: q, mode: "insensitive" } },
              {
                tagAssignments: {
                  some: {
                    nodes: {
                      some: {
                        OR: [
                          { name: { contains: q, mode: "insensitive" } },
                          { key: { contains: q.toLowerCase() } },
                        ],
                      },
                    },
                  },
                },
              },
            ],
          }
        : undefined;

    const untaggedCount = await prisma.mapConfig.count({
      where: {
        visibility: "public",
        tagAssignments: { none: {} },
        ...(searchWhere || {}),
      },
    });

    const maps = await prisma.mapConfig.findMany({
      where: untagged
        ? {
            visibility: "public",
            tagAssignments: { none: {} },
            ...(searchWhere || {}),
          }
        : {
            visibility: "public",
            AND: selected.map((key) => ({
              tagAssignments: {
                some: { nodes: { some: { key } } },
              },
            })),
            // Ensure untagged maps never appear even when nothing is selected.
            tagAssignments: { some: {} },
            ...(searchWhere || {}),
          },
      orderBy: { updatedAt: "desc" },
      take: 60,
      select: {
        id: true,
        title: true,
        filename: true,
        imageUrl: true,
        s3Key: true,
        updatedAt: true,
        user: { select: { username: true } },
        tagAssignments: {
          select: {
            nodes: { select: { id: true, key: true, name: true, kind: true } },
          },
        },
      },
    });

    // Facets: every node co-occurring on the result maps, minus the selected.
    const counts = new Map<
      string,
      { key: string; name: string; kind: string | null; mapIds: Set<string> }
    >();
    for (const map of maps) {
      const seen = new Set<string>();
      for (const assignment of map.tagAssignments) {
        for (const node of assignment.nodes) {
          if (selected.includes(node.key) || seen.has(node.key)) continue;
          seen.add(node.key);
          const entry = counts.get(node.key) || {
            key: node.key,
            name: node.name,
            kind: node.kind,
            mapIds: new Set(),
          };
          entry.mapIds.add(map.id);
          counts.set(node.key, entry);
        }
      }
    }

    const facets = [...counts.values()]
      .map(({ key, name, kind, mapIds }) => ({
        key,
        name,
        kind,
        count: mapIds.size,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return success({
      untaggedCount,
      maps: maps.map(({ tagAssignments, ...m }) => {
        const nodes = [
          ...new Map(
            tagAssignments.flatMap((a) => a.nodes).map((n) => [n.key, n]),
          ).values(),
        ];
        return { ...m, nodes };
      }),
      facets,
    });
  } catch (err: any) {
    return error(err.message || "Server error", 500);
  }
};
