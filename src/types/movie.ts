import * as database from "../database";
import { generateHash } from "../hash";
import Scene from "./scene";
import Actor from "./actor";
import Label from "./label";
import { mapAsync } from "./utility";

export default class Movie {
  _id: string;
  name: string;
  description: string | null = null;
  addedOn = +new Date();
  releaseDate: number | null = null;
  frontCover: string | null = null;
  backCover: string | null = null;
  favorite: boolean = false;
  bookmark: boolean = false;
  rating: number = 0;
  scenes: string[] = [];
  customFields: any = {};
  studio: string | null = null;

  static async calculateDuration(movie: Movie) {
    const scenesWithSource = (await Movie.getScenes(movie)).filter(
      scene => scene.meta && scene.path
    );

    if (!scenesWithSource.length) return null;

    return scenesWithSource.reduce(
      (dur, scene) => dur + <number>scene.meta.duration,
      0
    );
  }

  static async filterStudio(studioId: string) {
    await database.update(
      database.store.movies,
      { studio: studioId },
      { $set: { studio: null } }
    );
  }

  static async filterScene(scene: string) {
    await database.update(
      database.store.movies,
      {},
      { $pull: { scenes: scene } }
    );
  }

  static async filterImage(image: string) {
    await database.update(
      database.store.movies,
      { frontCover: image },
      { $set: { frontCover: null } }
    );

    await database.update(
      database.store.movies,
      { backCover: image },
      { $set: { backCover: null } }
    );
  }

  static async remove(_id: string) {
    await database.remove(database.store.movies, { _id });
  }

  static async getById(_id: string) {
    return (await database.findOne(database.store.movies, {
      _id
    })) as Movie | null;
  }

  static async getAll() {
    return (await database.find(database.store.movies, {})) as Movie[];
  }

  static async getByScene(id: string) {
    return (await database.find(database.store.movies, {
      scenes: id
    })) as Movie[];
  }

  static async getByStudio(id: string) {
    return (await database.find(database.store.movies, {
      studio: id
    })) as Movie[];
  }

  static async getLabels(movie: Movie) {
    const scenes = await Movie.getScenes(movie);
    const labelIds = [...new Set(scenes.map(scene => scene.labels).flat())];
    return (await mapAsync(labelIds, Label.getById)).filter(Boolean) as Label[];
  }

  static async getActors(movie: Movie) {
    const scenes = await Movie.getScenes(movie);
    const actorIds = [...new Set(scenes.map(scene => scene.actors).flat())];
    return (await mapAsync(actorIds, Actor.getById)).filter(Boolean) as Actor[];
  }

  static async getScenes(movie: Movie) {
    return (await mapAsync(movie.scenes, Scene.getById)).filter(
      Boolean
    ) as Scene[];
  }

  static async getRating(movie: Movie) {
    const scenesWithScore = (await Movie.getScenes(movie)).filter(
      scene => !!scene.rating
    );

    if (!scenesWithScore.length) return 0;

    return Math.round(
      scenesWithScore.reduce((rating, scene) => rating + scene.rating, 0) /
        scenesWithScore.length
    );
  }

  constructor(name: string, scenes: string[] = []) {
    this._id = generateHash();
    this.name = name.trim();
    this.scenes = scenes;
  }
}
