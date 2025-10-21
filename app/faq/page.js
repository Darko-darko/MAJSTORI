// app/faq/page.js - KOMPLETNA VERZIJA BEZ DUPLIKATA

'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SupportModal, useSupportModal } from '@/app/components/SupportModal'
import { faqData, searchFAQ } from '@/lib/faq-data'

export default function FAQPage() {
  const router = useRouter()
  const [openSection, setOpenSection] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightFirstResult, setHighlightFirstResult] = useState(false)
  
  // 🔒 AUTH STATE
  const [user, setUser] = useState(null)
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const { isOpen: supportOpen, openSupport, closeSupport } = useSupportModal()
  const firstResultRef = useRef(null)

  // 🔍 Popular searches - 9 termina za simetriju (3x3 grid)
  const popularSearches = [
    { term: 'Rechnung', icon: '📄' },
    { term: 'Kostenlos', icon: '💎' },
    { term: 'Trial', icon: '🎯' },
    { term: 'QR-Code', icon: '📱' },
    { term: 'DSGVO', icon: '🔐' },
    { term: 'Kunden', icon: '👥' },
    { term: 'ZUGFeRD', icon: '📊' },
    { term: 'DATEV', icon: '💼' },
    { term: 'Services', icon: '🔧' }  // 🆕 9. term
  ]

  // 🔒 CHECK AUTHENTICATION
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login?redirect=/faq')
        return
      }

      setUser(user)
      
      const { data: majstorData } = await supabase
        .from('majstors')
        .select('full_name')
        .eq('id', user.id)
        .single()
      
      setMajstor(majstorData)
    } catch (err) {
      console.error('Auth error:', err)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  // MAP FAQ DATA
  const faqCategories = useMemo(() => {
    return faqData.categories.map(cat => ({
      id: cat.id,
      title: `${cat.icon} ${cat.title}`,
      color: 'from-blue-600 to-blue-700',
      questions: cat.questions.map(q => ({
        q: q.question,
        a: q.answer
      }))
    }))
  }, [])

  // FILTER
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return faqCategories

    const results = searchFAQ(searchTerm)
    const categoriesMap = new Map()
    
    results.forEach(result => {
      const category = faqData.categories.find(cat => 
        cat.questions.some(q => q.id === result.id)
      )
      
      if (category) {
        if (!categoriesMap.has(category.id)) {
          categoriesMap.set(category.id, {
            id: category.id,
            title: `${category.icon} ${category.title}`,
            color: 'from-blue-600 to-blue-700',
            questions: []
          })
        }
        
        categoriesMap.get(category.id).questions.push({
          q: result.question,
          a: result.answer
        })
      }
    })
    
    return Array.from(categoriesMap.values())
  }, [searchTerm, faqCategories])

  const highlightText = (text, search) => {
    if (!search.trim()) return text
    const parts = text.split(new RegExp(`(${search})`, 'gi'))
    return parts.map((part, i) => 
      part.toLowerCase() === search.toLowerCase() 
        ? <mark key={i} className="bg-yellow-400 text-slate-900 px-1 rounded">{part}</mark>
        : part
    )
  }

  const totalResults = filteredCategories.reduce(
    (sum, cat) => sum + cat.questions.length, 
    0
  )

  // AUTO-SCROLL
  useEffect(() => {
    if (searchTerm && totalResults > 0 && firstResultRef.current) {
      setHighlightFirstResult(true)
      
      setTimeout(() => {
        const element = firstResultRef.current
        if (element) {
          const yOffset = -120 
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
          window.scrollTo({ top: y, behavior: 'smooth' })
        }
      }, 100)
      
      setTimeout(() => {
        setHighlightFirstResult(false)
      }, 2000)
    }
  }, [searchTerm, totalResults])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Laden...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      
      {/* HEADER */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-bold text-white">
            Pro-meister<span className="text-blue-400">.de</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard"
              className="text-slate-300 hover:text-white transition-colors"
            >
              ← Zurück zum Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6 animate-bounce">❓</div>
        <h1 className="text-5xl font-bold text-white mb-4">
          Häufig gestellte Fragen
        </h1>
        <p className="text-xl text-slate-300 mb-8">
          Finden Sie schnell Antworten auf Ihre Fragen zu pro-meister.de
        </p>

        {/* SEARCH BAR */}
        <div className="relative max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Suchen Sie nach einer Frage..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowSuggestions(false)
              }}
              onFocus={() => setShowSuggestions(!searchTerm)}
              className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-6 py-4 pr-12 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setShowSuggestions(true)
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <span className="text-xl">✕</span>
                </button>
              )}
              <span className="text-2xl">🔍</span>
            </div>
          </div>

          {/* SUGGESTIONS */}
          {showSuggestions && !searchTerm && (
            <div className="absolute top-full mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 z-10">
              <p className="text-slate-400 text-sm mb-3 font-medium">
                Beliebte Suchbegriffe:
              </p>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((search) => (
                  <button
                    key={search.term}
                    onClick={() => {
                      setSearchTerm(search.term)
                      setShowSuggestions(false)
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition-all text-sm"
                  >
                    <span>{search.icon}</span>
                    <span>{search.term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* RESULTS COUNTER */}
          {searchTerm && (
            <div className="mt-3 text-slate-400 text-sm">
              {totalResults > 0 ? (
                <span>
                  📊 <strong className="text-white">{totalResults}</strong> Ergebnis{totalResults !== 1 ? 'se' : ''} gefunden
                </span>
              ) : (
                <span className="text-red-400">
                  ❌ Keine Ergebnisse für &quot{searchTerm}&quot
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FAQ SECTIONS */}
      <div className="max-w-4xl mx-auto px-4 pb-16 space-y-8">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤷</div>
            <p className="text-slate-400 text-lg mb-4">
              Keine Ergebnisse für &quot<strong className="text-white">{searchTerm}</strong>&quot gefunden
            </p>
            
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 max-w-md mx-auto">
              <p className="text-slate-300 mb-3">💡 Versuchen Sie es mit:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {popularSearches.slice(0, 4).map((search) => (
                  <button
                    key={search.term}
                    onClick={() => setSearchTerm(search.term)}
                    className="px-3 py-1 bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition-all text-sm"
                  >
                    {search.icon} {search.term}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSearchTerm('')}
              className="mt-6 text-blue-400 hover:text-blue-300 underline"
            >
              ← Alle FAQs anzeigen
            </button>
          </div>
        ) : (
          filteredCategories.map((category, catIndex) => (
            <div 
              key={category.id} 
              className={`space-y-4 transition-all duration-500 ${
                catIndex === 0 && highlightFirstResult 
                  ? 'ring-2 ring-blue-500 ring-offset-4 ring-offset-slate-900 rounded-2xl' 
                  : ''
              }`}
              ref={catIndex === 0 ? firstResultRef : null}
            >
              
              <div className={`bg-gradient-to-r ${category.color} p-6 rounded-xl shadow-lg`}>
                <h2 className="text-2xl font-bold text-white flex items-center justify-between">
                  <span>{category.title}</span>
                  <span className="text-sm font-normal opacity-80">
                    {category.questions.length} Frage{category.questions.length !== 1 ? 'n' : ''}
                  </span>
                </h2>
              </div>

              <div className="space-y-3">
                {category.questions.map((item, idx) => {
                  const isOpen = openSection === `${category.id}-${idx}`
                  
                  return (
                    <div 
                      key={idx}
                      className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-all"
                    >
                      <button
                        onClick={() => setOpenSection(isOpen ? null : `${category.id}-${idx}`)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
                      >
                        <span className="text-lg font-semibold text-white pr-4">
                          {highlightText(item.q, searchTerm)}
                        </span>
                        <span className={`text-2xl text-blue-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </button>
                      
                      {isOpen && (
                        <div className="px-6 pb-4 text-slate-300 leading-relaxed border-t border-slate-700 pt-4">
                          <div 
                            className="prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ 
                              __html: item.a
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\n/g, '<br />')
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center shadow-2xl">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Frage nicht gefunden?
          </h2>
          <p className="text-blue-100 mb-6 text-lg">
            Unser Support-Team hilft Ihnen gerne weiter!
          </p>
          
          <button
            onClick={openSupport}
            className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 inline-flex items-center gap-2"
          >
            <span>✉️</span>
            <span>Support kontaktieren</span>
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center text-slate-400 mb-4">
            <p>&copy; 2024 pro-meister.de - Alle Rechte vorbehalten</p>
            <p className="text-xs mt-2">
              Version {faqData.metadata.version} • Zuletzt aktualisiert: {faqData.metadata.lastUpdated}
            </p>
          </div>
          <div className="flex justify-center gap-8 text-sm">
            <Link href="/impressum" className="text-slate-400 hover:text-white transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="text-slate-400 hover:text-white transition-colors">
              Datenschutz
            </Link>
            <Link href="/agb" className="text-slate-400 hover:text-white transition-colors">
              AGB
            </Link>
          </div>
        </div>
      </footer>

      <SupportModal 
        isOpen={supportOpen}
        onClose={closeSupport}
        userEmail={user?.email || ''}
        userName={majstor?.full_name || ''}
      />
    </div>
  )
}