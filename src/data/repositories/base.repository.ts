import DatabaseSetup from "@data";

class BaseRepository {
  public static prismaClient = DatabaseSetup.prismaClient;
}

export default BaseRepository;