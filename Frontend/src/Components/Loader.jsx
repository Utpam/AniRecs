import React from 'react'
import { useSelector } from 'react-redux'
import Anirevs from '../assets/Anirevs.svg'

const PageLoader = () => {
  return (
    <div className='fixed w-full h-screen place-items-center place-content-center bg-neutral/80 backdrop-blur-sm z-50 flex flex-col gap-3'>
        <img src={Anirevs} width={'150px'} className='animate-[spin_5s_linear_infinite] ' />
    </div>
  )
}

const BtnLoader = () => {
  return (
    <div className='w-full relative place-items-center'>
      <img src={Anirevs} width={'50px'} className='animate-[spin_5s_linear_infinite]'/>
    </div>
  )
}

function SkeletonPageLoader() {
  return (
    <div className="fixed inset-0 z-50 w-full h-screen bg-neutral/90 backdrop-blur-sm flex flex-col gap-6 overflow-auto">
      <div className="w-full py-3 bg-neutral/80 backdrop-blur-sm border-b border-white/10">
        <div className="mx-6 flex items-center justify-between gap-6">
          <div className="h-8 w-36 rounded-full bg-white/10 animate-pulse" />
          <div className="hidden md:flex items-center gap-4">
            <div className="h-10 w-72 rounded-full bg-white/10 animate-pulse" />
            <div className="h-8 w-20 rounded-full bg-white/10 animate-pulse" />
            <div className="h-8 w-20 rounded-full bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 py-8 max-w-7xl mx-auto w-full">
        <div className="h-52 md:h-64 rounded-3xl bg-white/10 animate-pulse mb-10" />

        {Array.from({ length: 4 }).map((_, rowIdx) => (
          <div key={rowIdx} className="mb-10">
            <div className="h-5 w-56 rounded-full bg-white/10 animate-pulse mb-3" />
            <div className="h-4 w-80 rounded-full bg-white/10 animate-pulse mb-6" />
            <div className="flex gap-4 overflow-x-auto pb-4">
              {Array.from({ length: 5 }).map((__, idx) => (
                <div key={idx} className="w-44 md:w-48 flex-shrink-0 h-60 rounded-3xl bg-white/10 animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Skeleton-style loader
function AnimeCardSkeleton() {
  return (
    <div className="w-44 md:w-48 shrink-0 flex flex-col">
      {/* Poster */}
      <div className="aspect-[3/4] rounded-xl bg-white/5 skeleton-shimmer" />

      {/* Title */}
      <div className="mt-3 h-4 w-4/5 rounded bg-white/10 skeleton-shimmer" />

      {/* Description */}
      <div className="mt-2 h-3 w-full rounded bg-white/5 skeleton-shimmer" />
      <div className="mt-1 h-3 w-3/4 rounded bg-white/5 skeleton-shimmer" />
    </div>
  );
}

function CarouselSkeleton() {
  return (
    <div className="w-full relative my-8">
      {/* Title */}
      <div className="h-6 w-48 rounded bg-white/10 skeleton-shimmer mb-3" />
      {/* Description */}
      <div className="h-3 w-72 rounded bg-white/5 skeleton-shimmer mb-6" />
      <div className="flex gap-4 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <AnimeCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="relative w-full h-[350px] md:h-[450px] bg-white/5 flex items-center px-6 md:px-12 overflow-hidden rounded-3xl">
      <div className="absolute inset-0 bg-white/5 skeleton-shimmer" />
      <div className="relative z-10 max-w-2xl space-y-6">
        <div className="space-y-3">
          <div className="h-10 md:h-14 w-[280px] md:w-[450px] rounded-2xl bg-white/10 skeleton-shimmer" />
          <div className="h-10 md:h-14 w-[200px] md:w-[350px] rounded-2xl bg-white/10 skeleton-shimmer" />
        </div>
        <div className="space-y-2 max-w-[500px]">
          <div className="h-4 w-full rounded bg-white/5 skeleton-shimmer" />
          <div className="h-4 w-[90%] rounded bg-white/5 skeleton-shimmer" />
        </div>
        <div className="flex gap-4 pt-2">
          <div className="h-10 w-32 rounded-[20px] bg-white/10 skeleton-shimmer" />
          <div className="h-10 w-36 rounded-[20px] bg-white/10 skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

function HomePageSkeleton() {
  const authStatus = useSelector(state => state.auth?.status);
  return (
    <div className="w-full min-h-screen bg-neutral pb-12">
      {/* {!authStatus && (
        <div className="px-6 md:px-12 py-8 max-w-7xl mx-auto">
          <HeroSkeleton />
        </div>
      )} */}
      <div className="px-6 md:px-12 py-8 max-w-7xl mx-auto space-y-12">
        {[...Array(authStatus ? 5 : 3)].map((_, idx) => (
          <CarouselSkeleton key={idx} />
        ))}
      </div>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="w-full space-y-6">
      <div className="h-5 w-40 rounded bg-white/10 skeleton-shimmer mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <div className="aspect-[3/4] rounded-xl bg-white/5 skeleton-shimmer" />
            <div className="h-4 w-4/5 rounded bg-white/10 skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* User Info Header */}
      <div className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/5">
        <div className="w-20 h-20 rounded-full bg-white/10 skeleton-shimmer" />
        <div className="space-y-3">
          <div className="h-6 w-48 rounded bg-white/10 skeleton-shimmer" />
          <div className="h-4 w-32 rounded bg-white/5 skeleton-shimmer" />
        </div>
      </div>
      
      {/* Playlists Tabs */}
      <div className="h-10 w-96 rounded bg-white/10 skeleton-shimmer" />
      
      {/* Grid of cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {[...Array(6)].map((_, i) => (
          <AnimeCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function AnimeDetailsSkeleton() {
  return (
    <div className="w-full min-h-screen text-tertiary bg-neutral overflow-x-hidden relative">
      {/* Large Banner Shimmer */}
      <div className="relative w-full h-[45vh] md:h-[60vh] bg-white/5 skeleton-shimmer" />
      
      {/* Details Content Layout */}
      <div className="max-w-7xl mx-auto px-4 pb-16 relative mt-0 md:-mt-24 z-30">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Poster & Sidebar */}
          <aside className="lg:col-span-3 flex flex-col w-full space-y-6">
            <div className="w-48 sm:w-56 md:w-64 lg:w-full mx-auto rounded-2xl aspect-[3/4] bg-white/5 skeleton-shimmer border border-white/10" />
            <div className="bg-secondary/40 border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="h-5 w-40 rounded bg-white/10 skeleton-shimmer mb-4" />
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-16 rounded bg-white/10 skeleton-shimmer" />
                  <div className="h-4 w-32 rounded bg-white/5 skeleton-shimmer" />
                </div>
              ))}
            </div>
          </aside>
          
          {/* Right Tabs and Info */}
          <article className="lg:col-span-9 w-full lg:pt-16 space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/5 skeleton-shimmer border border-white/5" />
              ))}
            </div>
            
            {/* Tab Header */}
            <div className="h-10 w-full border-b border-white/10 flex gap-6 pb-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-6 w-24 rounded bg-white/10 skeleton-shimmer" />
              ))}
            </div>
            
            {/* Tab Content Box */}
            <div className="bg-secondary/20 border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="h-5 w-32 rounded bg-white/10 skeleton-shimmer" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-white/5 skeleton-shimmer" />
                <div className="h-4 w-[95%] rounded bg-white/5 skeleton-shimmer" />
                <div className="h-4 w-[90%] rounded bg-white/5 skeleton-shimmer" />
                <div className="h-4 w-[85%] rounded bg-white/5 skeleton-shimmer" />
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

export {
  PageLoader,
  BtnLoader,
  SkeletonPageLoader,
  AnimeCardSkeleton,
  CarouselSkeleton,
  HeroSkeleton,
  HomePageSkeleton,
  SearchSkeleton,
  ProfileSkeleton,
  AnimeDetailsSkeleton
}
