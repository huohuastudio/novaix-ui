import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-gray-700">404</h1>
        <p className="text-gray-400 text-xl mt-4 mb-8">页面不存在</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
        >
          返回首页
        </Link>
      </div>
    </div>
  )
}
