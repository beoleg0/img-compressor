const sharp = require('sharp');
const fs = require('fs/promises');
const {chain} = require('lodash');

const srcPath = './src';
const distPath = './dist';
const allowedFormats = ['jpg', 'jpeg', 'png', 'webp'];
const quality = 80;


start();

async function start() {
  await clearDist();
  await createDist();
  const imagesPaths = await getImagesPaths();
  await createDistDirectories(imagesPaths);
  await processImages(imagesPaths);
  console.log('Done!');
}

async function clearDist() {
  try {
    await fs.access(distPath, fs.constants.F_OK);
    await fs.rm(distPath, {recursive: true});
    console.log('Dist folder cleared...');
  } catch (error) {
    console.log('Dist folder does not exist...');
  }

}

async function createDist() {
  await fs.mkdir(distPath);
  console.log('Dist folder created...');
}

async function getImagesPaths() {
  const getFullPath = async (path, directory) => {
    const fullPath = `${directory ? directory : ''}/${path.name}`;
    if (path.isDirectory()) {
      let files = await fs.readdir(`${srcPath}/${fullPath}`, {withFileTypes: true});
      return await Promise.all(files.map(async (f) => await getFullPath(f, fullPath)));
    } else {
      return fullPath;
    }
  };

  let root = await fs.readdir(srcPath, {withFileTypes: true});
  let paths = await Promise.all(root.map(async (r) => await getFullPath(r)));

  console.log('Images paths collected...');

  return chain(paths)
    .flattenDeep()
    .filter((path) => allowedFormats.includes(path.split('.').pop()))
    .map((path) => path.replace(/^\//, ''))
    .value();
}

async function createDistDirectories(paths) {
  const pathsWithoutFiles = paths.map((path) => path.split('/').slice(0, -1).join('/'));
  const uniquePaths = [...new Set(pathsWithoutFiles)];

  for (const path of uniquePaths) {
    await fs.mkdir(`${distPath}/${path}`, {recursive: true});
  }

  console.log('Dist directories created...');
}

function clearFormat(path) {
  return path.split('.').slice(0, -1).join('.');
}

async function createWebp(path, size) {
  const {width} = await sharp(`${srcPath}/${path}`).metadata();

  if (width > 1920) {
    await sharp(`${srcPath}/${path}`)
      .resize(1920)
      .webp({quality})
      .toFile(`${distPath}/${clearFormat(path)}.webp`);
  } else {
    await sharp(`${srcPath}/${path}`)
      .webp({quality})
      .toFile(`${distPath}/${clearFormat(path)}.webp`);
  }
}

async function createJpg(path, size) {
  const {width} = await sharp(`${srcPath}/${path}`).metadata();

  if (width > 1920) {
    await sharp(`${srcPath}/${path}`)
      .resize(1920)
      .jpeg({quality})
      .toFile(`${distPath}/${clearFormat(path)}.jpg`);
  } else {
    await sharp(`${srcPath}/${path}`)
      .jpeg({quality})
      .toFile(`${distPath}/${clearFormat(path)}.jpg`);
  }
}

async function processImages(imagesPaths) {
  const paths = await imagesPaths;

  paths.forEach((path) => {
    createWebp(path);
    createJpg(path);
  });

  console.log('Images processed...');
}