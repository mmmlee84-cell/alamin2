// Supabase Edge Function: naver-news
// 프론트엔드는 네이버 API를 직접 호출하지 않고 이 함수만 호출한다.
// Client ID/Secret은 코드에 직접 쓰지 않고 Deno.env.get()으로 읽는다.

const NAVER_NEWS_ENDPOINT = "https://openapi.naver.com/v1/search/news.json";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST 요청만 허용됩니다." }, 405);
  }

  let body: { keyword?: unknown };
  try {
    body = await req.json();
  } catch (_e) {
    return jsonResponse({ error: "keyword가 필요합니다." }, 400);
  }

  const keyword = body?.keyword;
  if (typeof keyword !== "string" || keyword.trim() === "") {
    return jsonResponse({ error: "keyword가 필요합니다." }, 400);
  }

  const clientId = Deno.env.get("NAVER_CLIENT_ID");
  const clientSecret = Deno.env.get("NAVER_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return jsonResponse({ error: "네이버 API 인증 정보가 설정되지 않았습니다." }, 500);
  }

  try {
    const url =
      `${NAVER_NEWS_ENDPOINT}?query=${encodeURIComponent(keyword)}&display=5&sort=date`;

    const naverRes = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });

    if (!naverRes.ok) {
      throw new Error(`Naver API responded with status ${naverRes.status}`);
    }

    const data = await naverRes.json();
    return jsonResponse(data, 200);
  } catch (_e) {
    return jsonResponse({ error: "뉴스 조회에 실패했습니다." }, 500);
  }
});
