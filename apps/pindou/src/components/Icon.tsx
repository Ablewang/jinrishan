import starSvg from '../assets/star.svg?raw'
import starFilledSvg from '../assets/star-filled.svg?raw'
import arrowRightSvg from '../assets/arrow-right.svg?raw'
import arrowLeftSvg from '../assets/arrow-left.svg?raw'
import checkSvg from '../assets/check.svg?raw'

interface IconProps {
  className?: string
}

function makeSvgComponent(raw: string) {
  return function Icon({ className }: IconProps) {
    const svg = raw
      .replace(/width="[^"]*"/, 'width="1em"')
      .replace(/height="[^"]*"/, 'height="1em"')
      .replace(/<path /g, '<path fill="currentColor" ')
    return <span className={className} style={{ display: 'inline-flex', alignItems: 'center' }} dangerouslySetInnerHTML={{ __html: svg }} />
  }
}

export const StarIcon = makeSvgComponent(starSvg)
export const StarFilledIcon = makeSvgComponent(starFilledSvg)
export const ArrowRightIcon = makeSvgComponent(arrowRightSvg)
export const ArrowLeftIcon = makeSvgComponent(arrowLeftSvg)
export const CheckIcon = makeSvgComponent(checkSvg)
