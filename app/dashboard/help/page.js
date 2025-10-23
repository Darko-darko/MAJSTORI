'use client'

import { useState, useRef } from 'react'
import { faqData } from '@/lib/faq-data'

export default function DashboardFAQPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedQuestions, setExpandedQuestions] = useState(new Set())
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const categoryRefs = useRef({})

  const getFilteredQuestions = () => {
    if (!searchTerm.trim()) return []
    const term = searchTerm.toLowerCase()
    const results = []
    faqData.categories.forEach(category => {
      category.questions.forEach(question => {
        if (
          question.question.toLowerCase().includes(term) ||
          question.answer.toLowerCase().includes(term) ||
          question.tags.some(tag => tag.toLowerCase().includes(term))
        ) {
          results.push({
            ...question,
            categoryTitle: category.title,
            categoryId: category.id
          })
        }
      })
    })
    return results
  }

  const filteredQuestions = getFilteredQuestions()
  const showSearchResults = searchTerm.trim().length > 0

  const toggleQuestion = (questionId) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId)
    } else {
      newExpanded.add(questionId)
    }
    setExpandedQuestions(newExpanded)
  }

  const scrollToCategory = (categoryId) => {
    setShowCategoryMenu(false)
    setTimeout(() => {
      const element = categoryRefs.current[categoryId]
      if (element) {
        const navHeight = 80
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
        const offsetPosition = elementPosition - navHeight
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    }, 100)
  }

  return (
    <div className="min-h-screen">
      {/* SKAČUĆI ZNAK PITANJA */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center text-3xl font-bold z-40 animate-bounce hover:animate-none"
        title="Zurück nach oben"
      >
        ?
      </button>

      {/* Hero Section */}
      <section className="pt-8 pb-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Hilfe & FAQ
          </h1>
          <p className="text-lg text-slate-300 mb-8">
            Finden Sie schnell Antworten auf Ihre Fragen
          </p>

          {/* HIBRIDNI SISTEM PRETRAGE */}
          <div className="relative max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="FAQ durchsuchen..."
                className="w-full px-6 py-4 bg-slate-800/50 border border-slate-600 rounded-full text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                className="w-full px-6 py-3 bg-slate-800/80 border border-slate-600 rounded-full text-white hover:bg-slate-700/80 transition-all flex items-center justify-between"
              >
                <span>📚 Nach Kategorie navigieren</span>
                <span className={`transition-transform ${showCategoryMenu ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {showCategoryMenu && (
                <div className="mt-2 bg-slate-800/95 backdrop-blur-md border border-slate-600 rounded-2xl overflow-hidden shadow-2xl">
                  {faqData.categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => scrollToCategory(category.id)}
                      className="w-full px-6 py-4 text-left hover:bg-slate-700/80 transition-all flex items-center gap-3 border-b border-slate-700 last:border-b-0"
                    >
                      <span className="text-2xl">{category.icon}</span>
                      <div>
                        <div className="text-white font-semibold">{category.title}</div>
                        <div className="text-slate-400 text-sm">{category.questions.length} Fragen</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {showSearchResults && (
            <div className="mb-12">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-2xl p-6 mb-6">
                <h2 className="text-xl font-bold text-white mb-2">
                  Suchergebnisse
                </h2>
                <p className="text-slate-400">
                  {filteredQuestions.length} {filteredQuestions.length === 1 ? 'Ergebnis' : 'Ergebnisse'} für &quot{searchTerm}&quot
                </p>
              </div>

              {filteredQuestions.length > 0 ? (
                <div className="space-y-4">
                  {filteredQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all"
                    >
                      <button
                        onClick={() => toggleQuestion(question.id)}
                        className="w-full px-6 py-4 text-left flex items-start justify-between gap-4"
                      >
                        <div className="flex-1">
                          <div className="text-xs text-blue-400 mb-1">
                            {question.categoryTitle}
                          </div>
                          <div className="text-white font-medium">
                            {question.question}
                          </div>
                        </div>
                        <div className={`text-blue-400 transition-transform flex-shrink-0 ${expandedQuestions.has(question.id) ? 'rotate-180' : ''}`}>
                          ▼
                        </div>
                      </button>
                      
                      {expandedQuestions.has(question.id) && (
                        <div className="px-6 pb-4 border-t border-slate-700 pt-4">
                          <div 
                            className="text-slate-300 prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ 
                              __html: question.answer
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\n/g, '<br />')
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-xl p-8 text-center">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-slate-300 mb-2">Keine Ergebnisse gefunden</p>
                  <p className="text-slate-400 text-sm">
                    Versuchen Sie andere Suchbegriffe oder navigieren Sie nach Kategorie
                  </p>
                </div>
              )}
            </div>
          )}

          {!showSearchResults && (
            <div className="space-y-12">
              {faqData.categories.map((category) => (
                <div
                  key={category.id}
                  ref={(el) => (categoryRefs.current[category.id] = el)}
                  className="scroll-mt-24"
                >
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{category.icon}</span>
                      <h2 className="text-2xl font-bold text-white">
                        {category.title}
                      </h2>
                    </div>
                    <p className="text-slate-400 ml-12">
                      {category.description}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {category.questions.map((question) => (
                      <div
                        key={question.id}
                        className="bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all"
                      >
                        <button
                          onClick={() => toggleQuestion(question.id)}
                          className="w-full px-6 py-4 text-left flex items-start justify-between gap-4"
                        >
                          <div className="text-white font-medium flex-1">
                            {question.question}
                          </div>
                          <div className={`text-blue-400 transition-transform flex-shrink-0 ${expandedQuestions.has(question.id) ? 'rotate-180' : ''}`}>
                            ▼
                          </div>
                        </button>
                        
                        {expandedQuestions.has(question.id) && (
                          <div className="px-6 pb-4 border-t border-slate-700 pt-4">
                            <div 
                              className="text-slate-300 prose prose-invert max-w-none"
                              dangerouslySetInnerHTML={{ 
                                __html: question.answer
                                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/\n/g, '<br />')
                                  .replace(/###\s/g, '<h3 class="text-lg font-bold text-white mt-4 mb-2">')
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-slate-800/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Noch Fragen?</h2>
          <p className="text-slate-300 mb-8">
            Unser Support-Team hilft Ihnen gerne weiter
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@pro-meister.de"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105"
            >
              📧 E-Mail Support
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}