exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { topics, count } = JSON.parse(event.body);

  const feeds = {
    technology: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    crypto:     "https://www.coindesk.com/arc/outboundfeeds/rss/",
    health:     "https://feeds.bbci.co.uk/news/health/rss.xml",
    business:   "https://feeds.bbci.co.uk/news/business/rss.xml",
    sports:     "https://feeds.bbci.co.uk/sport/rss.xml",
    science:    "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml"
  };

  const results = {};

  for (const topic of topics) {
    try {
      const url = feeds[topic];
      if (!url) continue;

      const res  = await fetch(url, {
        headers: { "User-Agent": "DigestAI/1.0 RSS Reader" }
      });
      const xml  = await res.text();
      const items = parseRSS(xml, count);
      results[topic] = items;
    } catch (err) {
      results[topic] = [];
    }
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ results })
  };
};

function parseRSS(xml, count) {
  const items = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/g) || [];

  for (const item of itemMatches.slice(0, count)) {
    const title   = stripTags(extract(item, "title"));
    const desc    = stripTags(extract(item, "description"));
    const link    = extract(item, "link") || extract(item, "guid");
    const pubDate = extract(item, "pubDate");
    const source  = extract(item, "source") || "RSS Feed";

    if (title && title.length > 5) {
      items.push({
        title:   cleanText(title),
        desc:    cleanText(desc).slice(0, 300),
        link:    cleanText(link),
        pubDate: pubDate ? timeAgo(new Date(pubDate)) : "Today",
        source:  cleanText(source)
      });
    }
  }

  return items;
}

function extract(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "i"));
  return match ? match[1].trim() : "";
}

function stripTags(str) {
  return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
            .replace(/<[^>]+>/g, "")
            .trim();
}

function cleanText(str) {
  return str.replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, " ")
            .trim();
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - date) / 1000 / 60);
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}
