import React from 'react'
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import SliderComponent from 'react-slick'
import { NavLink } from 'react-router-dom';


function SampleNextArrow(props) {
  const { className, style, onClick } = props;

  return (
    <div
      className={className}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
      }}
      onClick={onClick}
    >
      <div
        style={{
          width: "44px",
          height: "72px",
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <span style={{ color: "#fff", fontSize: "1.5rem" }}>❯</span>
      </div>
    </div>
  );
}

function SamplePrevArrow(props) {
  const { className, style, onClick } = props;
  return (
    <div
      className={className}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
      }}
      onClick={onClick}
    >
      <div
        style={{
          width: "44px",
          height: "72px",
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <span style={{ color: "#fff", fontSize: "1.5rem" }}>❮</span>
      </div>
    </div>
  );
}


function Carousel({ elements = [], isLoading = false }) {
    const Slider = SliderComponent.default || SliderComponent;
    const loadingSlides = Array.from({ length: 8 }, (_, index) => index)
    const slideRows = isLoading ? loadingSlides : elements

    var setting = {
        dots: false,
        infinite: false,
        speed: 500,
        slidesToShow: 8,
        slidesToScroll: 4,
        initialSlide: 0,
        nextArrow: <SampleNextArrow />,
        prevArrow: <SamplePrevArrow />,
        responsive: [
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: 3,
                    slidesToScroll: 3,
                    infinite: true,
                dots: true
                }
            },
            {
                breakpoint: 600,
                settings: {
                slidesToShow: 2,
                slidesToScroll: 2,
                initialSlide: 2
                }
            },
            {
                breakpoint: 480,
                settings: {
                slidesToShow: 1,
                slidesToScroll: 1
                }
            }
            ]
    };

  return (
    <div className='slider-container m-7'>
        <Slider {...setting}>
        {
            slideRows.map((item, index) => (
                isLoading ? (
                    <div key={`skeleton-${index}`} className="mx-2 px-1">
                        <div className="bg-[#28161D] rounded-sm border border-white/10 overflow-hidden">
                            <div className='h-56 w-full bg-white/10 animate-pulse' />
                            <div className='p-3'>
                                <div className='h-3 w-24 rounded-full bg-white/10 mb-3 animate-pulse' />
                                <div className='h-2 w-20 rounded-full bg-white/10 mb-2 animate-pulse' />
                                <div className='h-4 w-full rounded-full bg-white/10 animate-pulse' />
                            </div>
                        </div>
                    </div>
                ) : (
                    <NavLink key={item.mal_id} className="mx-2 px-1 group" to={`/anime/${item.title}/${item.mal_id}`} >
                        <div
                          className="bg-[#28161D] group rounded-sm border border-white/10 hover:border-tertiary transition-all duration-300 hover:border-tertiray hover:shadow-xl cursor-pointer overflow-hidden">
                              <img src={item.image} alt={item.title} className="w-full group-hover:scale-105 transition-all duration-400 aspect-3/4 object-cover" />
                          <div className="p-3">
                            <div className='flex gap-2'>
                              <img src='/mal.svg' className='w-4 inline' />
                              <p className="text-xs rel top-10 text-yellow-400 mb-2">
                                {item.mal_rating}
                              </p>
                            </div>
                            <hr className='py-1 text-white/20' />
                            <h2 className="text-sm font-semibold line-clamp-2 min-h-10">
                                {item.title}
                            </h2>
                          </div>
                        </div>
                    </NavLink>
                )
            ))
        }
                </Slider>
            </div>
  )
}

export default Carousel