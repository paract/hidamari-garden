import type { Metadata } from "next";

// my-tokens ページはクライアントコンポーネントのため、
// この layout で Discord などのプレビューカード（OGタグ）を上書きする
export const metadata: Metadata = {
  title: "マイトークン確認 | 陽だまりの庭",
  description: "あなたが持っている ATSC・BioNFT を確認できるページです。",
  openGraph: {
    title: "マイトークン確認 | 陽だまりの庭",
    description: "あなたが持っている ATSC・BioNFT を確認できるページです。",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "マイトークン確認 | 陽だまりの庭",
    description: "あなたが持っている ATSC・BioNFT を確認できるページです。",
  },
};

export default function MyTokensLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
