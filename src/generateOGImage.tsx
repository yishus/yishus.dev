import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";

const seededRandom = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return () => {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280;
  };
};

export const generateOGImage = async (
  title: string,
  date: string | undefined,
  filename: string,
  outputPath: string
): Promise<void> => {
  const fontPath = path.join(
    process.cwd(),
    "src",
    "fonts",
    "inter-regular.ttf"
  );
  const fontData = fs.readFileSync(fontPath);

  // Create seeded random for this filename
  const random = seededRandom(filename);

  // Generate random line properties with better visibility
  const diagonalLines = Array.from(
    { length: 6 + Math.floor(random() * 3) },
    (_, i) => {
      const useLeft = random() > 0.5;
      return {
        width: "2px",
        height: `${700 + random() * 300}px`,
        background: `rgba(${
          random() > 0.5 ? "88, 166, 255" : "188, 140, 255"
        }, ${0.12 + random() * 0.08})`,
        top: `${-200 + random() * 300}px`,
        ...(useLeft
          ? { left: `${random() * 800}px` }
          : { right: `${random() * 800}px` }),
        transform: `rotate(${-35 + random() * 70}deg)`,
      };
    }
  );

  const horizontalLines = Array.from(
    { length: 3 + Math.floor(random() * 2) },
    () => {
      const useTop = random() > 0.5;
      const useLeft = random() > 0.5;
      return {
        width: `${400 + random() * 500}px`,
        height: "1px",
        background: `rgba(${
          random() > 0.5 ? "88, 166, 255" : "188, 140, 255"
        }, ${0.08 + random() * 0.07})`,
        ...(useTop
          ? { top: `${50 + random() * 300}px` }
          : { bottom: `${50 + random() * 300}px` }),
        ...(useLeft ? { left: "0" } : { right: "0" }),
      };
    }
  );

  const svg = await satori(
    <div
      style={{
        width: "1200px",
        height: "628px",
        display: "flex",
        position: "relative",
        background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
        fontFamily: "Inter",
      }}
    >
      {/* Geometric lines background */}
      <div
        style={{
          position: "absolute",
          width: "1200px",
          height: "628px",
          display: "flex",
        }}
      >
        {/* Diagonal lines */}
        {diagonalLines.map((line, i) => (
          <div
            key={`diagonal-${i}`}
            style={{
              position: "absolute",
              display: "flex",
              ...line,
            }}
          />
        ))}

        {/* Horizontal lines */}
        {horizontalLines.map((line, i) => (
          <div
            key={`horizontal-${i}`}
            style={{
              position: "absolute",
              display: "flex",
              ...line,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
        }}
      >
        <h1
          style={{
            fontSize: "72px",
            fontWeight: "bold",
            color: "rgba(255, 255, 255, 0.95)",
            margin: "0 0 20px 0",
            lineHeight: "1.2",
            maxWidth: "900px",
          }}
        >
          {title}
        </h1>
        {date && (
          <p
            style={{
              fontSize: "32px",
              color: "rgba(255, 255, 255, 0.6)",
              margin: 0,
            }}
          >
            {new Date(date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </div>
    </div>,
    {
      width: 1200,
      height: 628,
      fonts: [
        {
          name: "Inter",
          data: fontData,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );

  const ogImagesPath = path.dirname(outputPath);
  fs.mkdirSync(ogImagesPath, { recursive: true });

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
};
