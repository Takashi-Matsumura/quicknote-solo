"use client";

import { FiArrowLeft, FiMapPin, FiBookmark, FiTag, FiSearch, FiDownload, FiShare, FiEdit } from "react-icons/fi";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center">
          <Link
            href="/"
            className="p-2 -ml-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
          >
            <FiArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="ml-2 text-lg font-semibold text-gray-900">アプリについて</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* App Overview */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <FiEdit className="text-blue-500 text-6xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">QuickNote Solo</h2>
              <p className="text-gray-600">個人用1行メモPWA</p>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              QuickNote Soloは、シンプルで使いやすい個人用メモアプリです。
              思いついたことをすぐにメモでき、位置情報やタグを付けて整理することができます。
              PWA（Progressive Web App）として動作するため、オフラインでも使用可能です。
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">主な機能</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                  <FiMapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">位置情報付きメモ</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    ボタンをタップして現在地をメモに添付できます
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 p-2 bg-yellow-100 rounded-lg">
                  <FiBookmark className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">ピン留め機能</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    重要なメモを一番上に固定表示できます
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 p-2 bg-green-100 rounded-lg">
                  <FiTag className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">タグ機能</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    メモにタグを付けて分類・絞り込みができます
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 p-2 bg-purple-100 rounded-lg">
                  <FiSearch className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">検索・フィルタ</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    テキスト検索、期間フィルタで素早くメモを見つけられます
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 p-2 bg-orange-100 rounded-lg">
                  <FiDownload className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">エクスポート・インポート</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    JSON/CSV/Markdown形式でデータをエクスポート・インポートできます
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 p-2 bg-indigo-100 rounded-lg">
                  <FiShare className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">オフライン対応</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    インターネット接続がなくてもメモの作成・閲覧が可能です
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Usage Tips */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">使い方のコツ</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">1</span>
                <p>メモはできるだけ短く、キーワードを含めて書くと検索しやすくなります</p>
              </div>
              <div className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">2</span>
                <p>タグは「仕事」「買い物」「アイデア」など用途別に分けると便利です</p>
              </div>
              <div className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">3</span>
                <p>位置情報は外出先でのメモに付けると後で思い出しやすくなります</p>
              </div>
              <div className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">4</span>
                <p>定期的にエクスポート機能でバックアップを取ることをおすすめします</p>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Info */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">技術情報</h3>
          </div>
          <div className="p-6 text-sm text-gray-600 space-y-2">
            <p><strong>バージョン:</strong> 1.0.0</p>
            <p><strong>フレームワーク:</strong> Next.js 15 (App Router)</p>
            <p><strong>データ保存:</strong> IndexedDB (ブラウザローカル)</p>
            <p><strong>PWA:</strong> Service Worker対応</p>
            <p><strong>対応ブラウザ:</strong> Chrome, Firefox, Safari, Edge (最新版)</p>
            <p className="text-xs text-gray-500 mt-4">
              ※ データはお使いのブラウザにのみ保存され、外部に送信されることはありません
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}