// 프로젝트 공통 설정값
// SUPABASE_ANON_KEY는 Supabase의 "공개용" anon key로, 브라우저에 노출되어도 안전하도록 설계된 값이다.
// 네이버 Client ID/Secret 등 실제 비밀 값은 여기 두지 않는다 (Supabase Edge Function 환경변수로만 관리).

const SUPABASE_NEWS_FUNCTION_URL = 'https://qkhklaalffktpkolmbsu.supabase.co/functions/v1/naver-news';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFraGtsYWFsZmZrdHBrb2xtYnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNjgyOTQsImV4cCI6MjA5OTc0NDI5NH0.7eH5qArzXvWz6SCMyrGtpSo5aOTy3NXj8nLpT_zZXUo';
