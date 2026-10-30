/** Decorative lesson covers. Lesson content and titles always come from the API. */
export function SpeakingLessonArt({ lesson }: { lesson: string }) {
  return <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    {lesson === "summer" ? <>
      <path fill="#e7efeb" d="M0 0h320v180H0z" /><circle cx="233" cy="56" r="27" fill="#dfc58e" />
      <path d="m0 103 47-38 50 35 46-49 65 52 41-24 71 34v67H0Z" fill="#becfc1" />
      <path d="m0 120 75-18 49 18 77-5 119 16v49H0Z" fill="#80aaa1" />
      <path d="M0 149c47-18 81 14 128 0s88-2 112 5 57-4 80-3v29H0Z" fill="#558c80" />
      <path d="M0 172c55-28 80-1 116 8H0Z" fill="#ede0bf" />
      <path d="m170 124 60 1-10 12h-37l-13-13Z" fill="#30594d" /><path d="M202 79v44m-4-38-25 33h25V85Z" fill="#fff9e7" /><path d="m207 91 17 27h-17V91Z" fill="#e4cda2" />
      <path d="M49 152c3-20 6-41 4-63" stroke="#69755a" strokeWidth="5" strokeLinecap="round" /><path d="M54 89C31 64 18 83 19 90c13-7 23-4 35-1Zm0 0c12-28 35-23 37-12-15-1-24 4-37 12Zm0 0C51 64 35 58 32 68c10 2 16 10 22 21Zm0 0c23-11 36 3 29 12-8-10-17-11-29-12Z" fill="#6c8967" />
      <path d="m122 39 6-3 6 3m18 4 5-3 5 3" stroke="#7a9585" strokeWidth="2" strokeLinecap="round" />
    </> : lesson === "earth" ? <>
      <path fill="#e9eddf" d="M0 0h320v180H0z" /><circle cx="162" cy="88" r="61" fill="#cadbce" />
      <circle cx="162" cy="88" r="47" fill="#709e90" /><path d="m141 48 12 9-4 15 19 7 3 16-13 7-7 25-14-8-3-20-15-14-3-15 25-22Zm48 6-14 17 8 17 19 1 3 23 4-24-5-20-15-14Z" fill="#d7e3b9" />
      <path d="m224 127 16-38c22 16 14 38-16 38Zm-3 3c-5-31-30-35-34-21 18 2 20 9 34 21Z" fill="#76945e" /><path d="m221 136 19-37" stroke="#4d7055" strokeWidth="2" strokeLinecap="round" />
      <path d="M73 116h20m-10-10v20" stroke="#bd9f66" strokeWidth="2" strokeLinecap="round" /><circle cx="244" cy="44" r="4" fill="#bd9f66" /><path d="M94 42c-34 55-8 107 44 114m47-136c40 5 67 30 68 57" stroke="#9caf94" strokeDasharray="3 7" strokeLinecap="round" />
    </> : <>
      <path fill="#f2e9da" d="M0 0h320v180H0z" /><path d="M46 55c19-39 85-32 92 9 15 32-2 68-47 67-39 11-70-40-45-76Z" fill="#e5d8be" />
      <rect x="87" y="38" width="109" height="76" rx="20" fill="#fffaf0" stroke="#b6a780" strokeWidth="2" /><path d="m101 110-4 17 22-15" fill="#fffaf0" stroke="#b6a780" strokeWidth="2" strokeLinejoin="round" />
      <rect x="147" y="77" width="93" height="61" rx="19" fill="#60927d" /><path d="m224 134 5 15-23-13" fill="#60927d" />
      <path d="M110 60h59m-59 13h39m-39 13h21" stroke="#a6b59b" strokeWidth="4" strokeLinecap="round" /><circle cx="174" cy="107" r="4" fill="#f3e8cd" /><circle cx="194" cy="107" r="4" fill="#f3e8cd" /><circle cx="214" cy="107" r="4" fill="#f3e8cd" />
      <path d="m240 39 3 9 9 3-9 3-3 9-3-9-9-3 9-3 3-9Z" fill="#c2a46b" /><circle cx="72" cy="137" r="4" fill="#a5b596" />
    </>}
  </svg>;
}
