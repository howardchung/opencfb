/* Downloads data from jhowell and writes to a CSV file */
import fs from 'node:fs';

export async function JHowellFetcher(filename: string): Promise<void> {
  const writeStream = fs.createWriteStream(filename, { encoding: 'utf8' });

  const resp = await fetch('http://www.jhowell.net/cf/scores/byName.htm');
  if (!resp.ok) {
    throw new Error(`Failed to fetch byName.htm: ${resp.statusText}`);
  }
  const html = await resp.text();

  // Find all <a href="..."> inside <p> except ScoresIndex.htm
  const pRegex = /<p[^>]*>[\s\S]*?<a\s+[^>]*href=["']?([^"'>\s]+)["']?[^>]*>[\s\S]*?<\/p>/gi;
  const hrefs: string[] = [];
  let pMatch: RegExpExecArray | null;
  while ((pMatch = pRegex.exec(html)) !== null) {
    const href = pMatch[1];
    if (href && !href.includes('ScoresIndex.htm')) {
      hrefs.push(href);
    }
  }

  for (const pageName of hrefs) {
    await readScores(writeStream, pageName);
  }

  await new Promise<void>((resolve, reject) => {
    writeStream.end((err?: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function readScores(writeStream: fs.WriteStream, pageName: string): Promise<void> {
  const resp = await fetch(`http://www.jhowell.net/cf/scores/${pageName}`);
  if (!resp.ok) {
    console.error(`Failed to fetch scores for ${pageName}: ${resp.statusText}`);
    return;
  }
  const html = await resp.text();
  const schoolName = pageName.replace(/\.htm$/i, '');

  let currentYear = '';

  // Parse row by row and anchor tags
  const elementRegex = /<a\s+[^>]*name=["']?([^"'>\s]+)["']?[^>]*>|<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;

  while ((match = elementRegex.exec(html)) !== null) {
    if (match[1]) {
      currentYear = match[1];
      continue;
    }

    const trContent = match[2];
    if (!trContent) continue;

    let line = `${schoolName},${currentYear},`;
    let hasBgColor = false;

    const tdRegex = /<td\s+[^>]*bgcolor=["']?[^"'>\s]+["']?[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch: RegExpExecArray | null;

    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      hasBgColor = true;
      const inner = tdMatch[1].trim();
      const aMatch = /<a\s+[^>]*href=["']?([^"'>\s]+)["']?[^>]*>/i.exec(inner);
      if (aMatch) {
        const linkedSchool = aMatch[1].replace(/\.htm$/i, '');
        line += `${linkedSchool},`;
      } else {
        const text = inner.replace(/<[^>]+>/g, '').trim();
        line += `${text},`;
      }
    }

    if (hasBgColor) {
      writeStream.write(line + '\n');
    }
  }
}
