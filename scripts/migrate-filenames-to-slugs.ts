import { PrismaClient } from "@prisma/client";
import { slugify, generateUniqueSlug } from "../netlify/lib/validation";

const prisma = new PrismaClient();

async function migrateFilenamesToSlugs() {
  console.log("Starting filename to slug migration...");

  try {
    // Get all map configs
    const mapConfigs = await prisma.mapConfig.findMany({
      select: {
        id: true,
        filename: true,
        userId: true,
        title: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log(`Found ${mapConfigs.length} map configs to process`);

    // Group by userId to handle uniqueness per user
    const userMaps = new Map<string, typeof mapConfigs>();
    for (const config of mapConfigs) {
      if (!userMaps.has(config.userId)) {
        userMaps.set(config.userId, []);
      }
      userMaps.get(config.userId)!.push(config);
    }

    let totalUpdated = 0;
    let totalSkipped = 0;

    // Process each user's maps
    for (const [userId, maps] of userMaps.entries()) {
      const usedSlugs: string[] = [];

      for (const map of maps) {
        const currentFilename = map.filename;

        // Generate slug from current filename or title
        let baseSlug = currentFilename
          ? slugify(currentFilename)
          : slugify(map.title || "map");

        // If slug is empty after slugification, use a default
        if (!baseSlug || baseSlug.length < 3) {
          baseSlug = "map";
        }

        // Ensure uniqueness for this user
        const uniqueSlug = generateUniqueSlug(baseSlug, usedSlugs);
        usedSlugs.push(uniqueSlug);

        // Only update if the slug is different from current filename
        if (uniqueSlug !== currentFilename) {
          await prisma.mapConfig.update({
            where: { id: map.id },
            data: { filename: uniqueSlug },
          });

          console.log(
            `Updated: "${currentFilename}" -> "${uniqueSlug}" (${map.title})`
          );
          totalUpdated++;
        } else {
          console.log(`Skipped: "${currentFilename}" (already valid)`);
          totalSkipped++;
        }
      }
    }

    console.log("\nMigration complete!");
    console.log(`Updated: ${totalUpdated} maps`);
    console.log(`Skipped: ${totalSkipped} maps (already valid)`);
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateFilenamesToSlugs()
  .then(() => {
    console.log("Migration script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
