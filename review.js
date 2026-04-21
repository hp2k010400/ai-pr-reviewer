import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const repo = process.env.REPO;
const prNumber = process.env.PR_NUMBER;
const token = process.env.GITHUB_TOKEN;

async function getDiff() {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/pulls/${prNumber}/files`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
  const files = await res.json();
  return files
    .map((f) => `### ${f.filename}\n\`\`\`\n${f.patch ?? ""}\n\`\`\``)
    .join("\n\n");
}

async function postComment(body) {
  await fetch(
    `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ body }),
    }
  );
}

const diff = await getDiff();

const message = await anthropic.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: `You are a code reviewer. Review this pull request diff and give concise, helpful feedback. Flag any bugs, edge cases, or improvements. Be direct and specific.\n\n${diff}`,
    },
  ],
});

await postComment(`## AI Code Review\n\n${message.content[0].text}`);
