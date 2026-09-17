// Problem `type` URI의 접두어. 서버(problem.ts)와 화면(problem-client.ts)이 공유한다 —
// problem.ts는 next/server를 끌고 오므로 클라이언트 번들이 이 상수만 가져가도록 분리했다.
export const PROBLEM_TYPE_BASE = 'https://ateliercreme.example/errors/';
