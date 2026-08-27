import React from 'react';

const createMotionComponent = (Tag: any) => {
  return React.forwardRef((props: any, ref) => {
    const { 
      initial, animate, exit, transition, variants, 
      whileHover, whileTap, whileFocus, whileInView, 
      layoutId, layout, viewport, drag, dragConstraints, dragElastic, 
      ...rest 
    } = props;
    return React.createElement(Tag, { ref, ...rest });
  });
};

export const motion = {
  div: createMotionComponent('div'),
  span: createMotionComponent('span'),
  button: createMotionComponent('button'),
  li: createMotionComponent('li'),
  p: createMotionComponent('p'),
  section: createMotionComponent('section'),
  article: createMotionComponent('article'),
  h1: createMotionComponent('h1'),
  h2: createMotionComponent('h2'),
  h3: createMotionComponent('h3'),
  ul: createMotionComponent('ul'),
  nav: createMotionComponent('nav'),
  main: createMotionComponent('main'),
  header: createMotionComponent('header'),
  footer: createMotionComponent('footer'),
  form: createMotionComponent('form'),
  input: createMotionComponent('input'),
  label: createMotionComponent('label'),
  img: createMotionComponent('img'),
  svg: createMotionComponent('svg'),
  path: createMotionComponent('path'),
  a: createMotionComponent('a'),
  tr: createMotionComponent('tr'),
  td: createMotionComponent('td'),
  th: createMotionComponent('th'),
  tbody: createMotionComponent('tbody'),
  thead: createMotionComponent('thead'),
  table: createMotionComponent('table'),
};

export const AnimatePresence = ({ children }: any) => {
  return <>{children}</>;
};

export const useAnimation = () => {
  return {
    start: () => Promise.resolve(),
    stop: () => {},
    set: () => {},
  };
};

export const useScroll = () => ({ scrollYProgress: 0 });
export const useTransform = () => 0;
export const useSpring = () => 0;
export const useMotionValue = () => ({ get: () => 0, set: () => {}, on: () => () => {} });
