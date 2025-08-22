"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signUp, signIn } from "@/lib/auth"

export default function AuthForm({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = isLogin ? await signIn(email, password) : await signUp(email, password)

    if (result.error) {
      setError(result.error)
    } else {
      onAuthSuccess(result.user)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-white dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 flex items-center justify-center p-4 relative">
      {/* Snowy effect for light mode */}
      <div className="snow-effect dark:hidden"></div>
      
      <Card className="w-full max-w-md bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-xl relative z-10">
        <CardHeader>
          <CardTitle className="text-center text-gray-900 dark:text-white">{isLogin ? "Sign In" : "Sign Up"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-100/60 border border-red-400/60 text-red-700 rounded backdrop-blur-sm">{error}</div>}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-900 dark:text-white">
                Email
              </Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-white/40 dark:border-white/20 focus:border-blue-400 dark:focus:border-blue-400" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-900 dark:text-white">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-white/40 dark:border-white/20 focus:border-blue-400 dark:focus:border-blue-400"
              />
            </div>

            <Button type="submit" className="w-full bg-blue-500/80 hover:bg-blue-600/80 backdrop-blur-sm border border-blue-400/40 text-white shadow-lg" disabled={loading}>
              {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>

            <Button type="button" variant="ghost" className="w-full bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-white/10 hover:bg-white/30 dark:hover:bg-black/30 text-gray-900 dark:text-white" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
